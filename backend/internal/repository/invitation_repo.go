package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// InvitationRepo handles persistence for share invitations.
type InvitationRepo struct {
	db *pgxpool.Pool
}

// NewInvitationRepo constructs an InvitationRepo.
func NewInvitationRepo(db *pgxpool.Pool) *InvitationRepo { return &InvitationRepo{db: db} }

// Create inserts a new invitation row.
func (r *InvitationRepo) Create(ctx context.Context, inv *models.Invitation) error {
	const q = `
		INSERT INTO invitations (child_id, email, role, token, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`
	return r.db.QueryRow(ctx, q,
		inv.ChildID, inv.Email, inv.Role, inv.Token, inv.ExpiresAt).
		Scan(&inv.ID, &inv.CreatedAt)
}

// GetByToken returns the invitation matching a token.
func (r *InvitationRepo) GetByToken(ctx context.Context, token string) (*models.Invitation, error) {
	const q = `
		SELECT id, child_id, email, role, token, expires_at, accepted_at, created_at
		FROM invitations WHERE token = $1`
	var inv models.Invitation
	err := r.db.QueryRow(ctx, q, token).Scan(
		&inv.ID, &inv.ChildID, &inv.Email, &inv.Role, &inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get invitation by token: %w", err)
	}
	return &inv, nil
}

// MarkAccepted records the acceptance timestamp for an invitation.
func (r *InvitationRepo) MarkAccepted(ctx context.Context, id interface{}) error {
	ct, err := r.db.Exec(ctx,
		`UPDATE invitations SET accepted_at = now() WHERE id = $1 AND accepted_at IS NULL`, id)
	if err != nil {
		return fmt.Errorf("mark accepted: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetByChild returns all invitations for a child.
func (r *InvitationRepo) GetByChild(ctx context.Context, childID interface{}) ([]*models.Invitation, error) {
	const q = `
		SELECT id, child_id, email, role, token, expires_at, accepted_at, created_at
		FROM invitations WHERE child_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, q, childID)
	if err != nil {
		return nil, fmt.Errorf("query invitations: %w", err)
	}
	defer rows.Close()

	var out []*models.Invitation
	for rows.Next() {
		var inv models.Invitation
		if err := rows.Scan(&inv.ID, &inv.ChildID, &inv.Email, &inv.Role, &inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan invitation: %w", err)
		}
		out = append(out, &inv)
	}
	return out, rows.Err()
}
