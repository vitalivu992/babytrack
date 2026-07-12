package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/vitalivu992/babytrack/internal/repository"
	"github.com/vitalivu992/babytrack/internal/services"
)

// OK writes a 200 JSON success envelope.
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// Created writes a 201 JSON success envelope.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

// Err writes a JSON error envelope with a status derived from the error type.
func Err(c *gin.Context, err error) {
	status, msg := mapError(err)
	c.JSON(status, gin.H{"error": msg})
}

// mapError translates a service/repository error into an HTTP status + message.
func mapError(err error) (int, string) {
	switch {
	case err == nil:
		return http.StatusOK, ""
	case errors.Is(err, errBadID):
		return http.StatusBadRequest, "invalid id"
	case errors.Is(err, errBadChildID):
		return http.StatusBadRequest, "invalid child_id"
	case errors.Is(err, errNoUser):
		return http.StatusUnauthorized, "unauthorized"
	}
	if ve := (*validationErr)(nil); errors.As(err, &ve) {
		return http.StatusBadRequest, err.Error()
	}
	switch {
	case errors.Is(err, repository.ErrNotFound):
		return http.StatusNotFound, "not found"
	case errors.Is(err, repository.ErrConflict):
		return http.StatusConflict, "conflict"
	case errors.Is(err, services.ErrInvalidCredentials):
		return http.StatusUnauthorized, "invalid credentials"
	case errors.Is(err, services.ErrInvalidToken):
		return http.StatusUnauthorized, "invalid or expired token"
	case errors.Is(err, services.ErrEmailTaken):
		return http.StatusConflict, "email already registered"
	case errors.Is(err, services.ErrAccessDenied):
		return http.StatusForbidden, "access denied"
	case errors.Is(err, services.ErrValidation):
		// surface the wrapped detail message
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, services.ErrExpired):
		return http.StatusGone, "invitation expired"
	case errors.Is(err, services.ErrAlreadyAccepted):
		return http.StatusConflict, "invitation already accepted"
	}
	return http.StatusInternalServerError, "internal server error"
}
