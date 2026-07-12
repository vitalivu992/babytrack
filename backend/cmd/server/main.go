// Package main is the BabyTrack server entry point. It wires configuration,
// the database pool, migrations, services, middleware, and HTTP handlers into a
// single Gin router.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/config"
	"github.com/vitalivu992/babytrack/internal/frontend"
	"github.com/vitalivu992/babytrack/internal/handlers"
	"github.com/vitalivu992/babytrack/internal/middleware"
	"github.com/vitalivu992/babytrack/internal/migrations"
	"github.com/vitalivu992/babytrack/internal/repository"
	"github.com/vitalivu992/babytrack/internal/services"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("babytrack: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	if cfg.IsDevelopment() {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	rootCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	pool, err := repository.New(rootCtx, cfg.DBURL)
	cancel()
	if err != nil {
		return err
	}
	defer pool.Close()

	migCtx, migCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer migCancel()
	if err := migrations.Run(migCtx, pool); err != nil {
		return err
	}
	log.Println("migrations applied")

	// --- repositories ---
	userRepo := repository.NewUserRepo(pool)
	childRepo := repository.NewChildRepo(pool)
	childUserRepo := repository.NewChildUserRepo(pool)
	activityRepo := repository.NewActivityRepo(pool)
	measureRepo := repository.NewMeasurementRepo(pool)
	vaccRepo := repository.NewVaccinationRepo(pool)
	reminderRepo := repository.NewReminderRepo(pool)
	invRepo := repository.NewInvitationRepo(pool)

	// --- services ---
	authSvc := services.NewAuthService(userRepo)
	childSvc := services.NewChildService(childRepo, childUserRepo)
	activitySvc := services.NewActivityService(activityRepo)
	insightsSvc := services.NewInsightsService(activityRepo, measureRepo)
	shareSvc := services.NewShareService(invRepo, childUserRepo, userRepo)
	vaccSvc := services.NewVaccinationService(vaccRepo, childRepo)

	// --- handlers ---
	authH := handlers.NewAuthHandler(authSvc, cfg.IsDevelopment())
	childH := handlers.NewChildHandler(childSvc)
	activityH := handlers.NewActivityHandler(activitySvc)
	measureH := handlers.NewMeasurementHandler(measureRepo)
	vaccH := handlers.NewVaccinationHandler(vaccSvc)
	shareH := handlers.NewShareHandler(shareSvc)
	insightsH := handlers.NewInsightsHandler(activitySvc, insightsSvc)
	reminderH := handlers.NewReminderHandler(reminderRepo)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(cfg.IsDevelopment()))
	rateLimiter := middleware.NewRateLimiter(config.RateLimitPerMinute, time.Minute)
	r.Use(middleware.RateLimit(rateLimiter))

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")

	// --- public auth routes ---
	auth := api.Group("/auth")
	{
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)
	}

	// --- authenticated routes ---
	authed := api.Group("")
	authed.Use(middleware.Auth(authSvc))
	{
		authed.GET("/auth/me", authH.Me)
		authed.POST("/invitations/accept", shareH.Accept)

		children := authed.Group("/children")
		{
			children.GET("", childH.List)
			children.POST("", childH.Create)

			// viewer+ routes (read)
			view := children.Group("/:child_id", middleware.RequireAccess(shareSvc, ""))
			{
				view.GET("", childH.Get)
				view.GET("/logs", activityH.List)
				view.GET("/measurements", measureH.List)
				view.GET("/vaccinations", vaccH.List)
				view.GET("/vaccinations/upcoming", vaccH.Upcoming)
				view.GET("/vaccinations/ensure", vaccH.EnsureSchedule)
				view.GET("/reminders", reminderH.List)
				view.GET("/members", shareH.Members)
				view.GET("/insights/daily", insightsH.Daily)
				view.GET("/insights/weekly", insightsH.Weekly)
				view.GET("/insights/feeding", insightsH.Feeding)
				view.GET("/insights/sleep", insightsH.Sleep)
				view.GET("/insights/growth", insightsH.Growth)
			}

			// editor+ routes (write)
			edit := children.Group("/:child_id", middleware.RequireAccess(shareSvc, "editor"))
			{
				edit.PATCH("", childH.Update)
				edit.POST("/logs", activityH.Create)
				edit.POST("/measurements", measureH.Create)
				edit.PATCH("/measurements/:id", measureH.Update)
				edit.DELETE("/measurements/:id", measureH.Delete)
				edit.DELETE("/logs/:id", activityH.Delete)
				edit.PATCH("/vaccinations/:id", vaccH.MarkAdministered)
				edit.DELETE("/vaccinations/:id", vaccH.Delete)
				edit.POST("/vaccinations/schedule", vaccH.GenerateSchedule)
				edit.POST("/reminders", reminderH.Create)
				edit.PATCH("/reminders/:id", reminderH.Update)
				edit.DELETE("/reminders/:id", reminderH.Delete)
			}

			// owner-only routes
			owner := children.Group("/:child_id", middleware.RequireAccess(shareSvc, "owner"))
			{
				owner.DELETE("", childH.Delete)
				owner.POST("/invitations", shareH.Invite)
				owner.DELETE("/members/:user_id", shareH.Revoke)
			}
		}
	}

	// --- embedded frontend SPA (served for any non-API, non-health route) ---
	spaHandler, err := frontend.Handler()
	if err != nil {
		log.Printf("warning: frontend not embedded (%v) — serving API only", err)
	} else {
		r.NoRoute(spaHandler)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("babytrack listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	return srv.Shutdown(shutdownCtx)
}
