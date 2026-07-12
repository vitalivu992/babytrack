package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// UserRepo handles persistence for users.
type UserRepo struct {
	db *pgxpool.Pool
}

// NewUserRepo constructs a UserRepo.
func NewUserRepo(db *pgxpool.Pool) *UserRepo { return &UserRepo{db: db} }

// CreateUser inserts a new user row.
func (r *UserRepo) CreateUser(ctx context.Context, u *models.User) error {
	const q = `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, q, u.Email, u.PasswordHash, u.Name).
		Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

// GetUserByEmail returns the user with the given email.
func (r *UserRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	const q = `
		SELECT id, email, password_hash, name, created_at, updated_at
		FROM users WHERE email = $1`
	var u models.User
	err := r.db.QueryRow(ctx, q, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &u, nil
}

// GetUserByID returns the user with the given id.
func (r *UserRepo) GetUserByID(ctx context.Context, id interface{}) (*models.User, error) {
	const q = `
		SELECT id, email, password_hash, name, created_at, updated_at
		FROM users WHERE id = $1`
	var u models.User
	err := r.db.QueryRow(ctx, q, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

// UpdateUser updates the mutable fields of a user.
func (r *UserRepo) UpdateUser(ctx context.Context, u *models.User) error {
	const q = `
		UPDATE users SET name = $1, password_hash = $2, updated_at = now()
		WHERE id = $3 RETURNING updated_at`
	return r.db.QueryRow(ctx, q, u.Name, u.PasswordHash, u.ID).Scan(&u.UpdatedAt)
}
