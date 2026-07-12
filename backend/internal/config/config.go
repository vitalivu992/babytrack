package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment.
type Config struct {
	Port      string
	DBURL     string
	JWTSecret string
	ENV       string
}

// Load reads configuration from the environment (and .env file if present).
func Load() (*Config, error) {
	// Ignore error: .env is optional (e.g. in production / docker).
	_ = godotenv.Load()

	cfg := &Config{
		Port:      getEnv("PORT", "8080"),
		DBURL:     getEnv("DB_URL", ""),
		JWTSecret: getEnv("JWT_SECRET", ""),
		ENV:       getEnv("ENV", "development"),
	}

	if cfg.DBURL == "" {
		return nil, fmt.Errorf("DB_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	return cfg, nil
}

// IsProduction reports whether the app runs in production mode.
func (c *Config) IsProduction() bool { return c.ENV == "production" }

// IsDevelopment reports whether the app runs in development mode.
func (c *Config) IsDevelopment() bool { return c.ENV == "development" }

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

// RateLimitPerMinute is the global per-IP request cap.
const RateLimitPerMinute = 100

// JWTExpiryHours is how long issued JWT tokens remain valid.
const JWTExpiryHours = 24

// BcryptCost controls password hashing expense.
const BcryptCost = 10

// AtoiDefault converts s to int with a fallback.
func AtoiDefault(s string, fallback int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return n
}
