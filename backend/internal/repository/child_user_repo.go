package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vitalivu992/babytrack/internal/models"
)

// ChildUserRepo handles the child_users shared-access mapping.
type ChildUserRepo struct {
	db *pgxpool.Pool
}

// NewChildUserRepo constructs a ChildUserRepo.
func NewChildUserRepo(db *pgxpool.Pool) *ChildUserRepo { return &ChildUserRepo{db: db} }

// Grant gives a user a role on a child. If the mapping already exists, the
// role is updated.
func (r *ChildUserRepo) Grant(ctx context.Context, childID, userID interface{}, role string) error {
	const q = `
		INSERT INTO child_users (child_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (child_id, user_id) DO UPDATE SET role = EXCLUDED.role`
	_, err := r.db.Exec(ctx, q, childID, userID, role)
	if err != nil {
		return fmt.Errorf("grant child access: %w", err)
	}
	return nil
}

// Revoke removes a user's access to a child (owners cannot be revoked).
func (r *ChildUserRepo) Revoke(ctx context.Context, childID, userID interface{}) error {
	ct, err := r.db.Exec(ctx,
		`DELETE FROM child_users WHERE child_id = $1 AND user_id = $2 AND role <> 'owner'`,
		childID, userID)
	if err != nil {
		return fmt.Errorf("revoke child access: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetRole returns the requesting user's role on a child, or ErrNotFound.
func (r *ChildUserRepo) GetRole(ctx context.Context, childID, userID interface{}) (string, error) {
	var role string
	err := r.db.QueryRow(ctx,
		`SELECT role FROM child_users WHERE child_id = $1 AND user_id = $2`,
		childID, userID).Scan(&role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", fmt.Errorf("get role: %w", err)
	}
	return role, nil
}

// GetUsersByChild returns all users (with email/name and role) sharing a child.
func (r *ChildUserRepo) GetUsersByChild(ctx context.Context, childID interface{}) ([]*models.ChildUser, error) {
	const q = `
		SELECT cu.child_id, cu.user_id, cu.role, cu.invited_at, u.email, u.name
		FROM child_users cu
		JOIN users u ON u.id = cu.user_id
		WHERE cu.child_id = $1
		ORDER BY cu.invited_at ASC`
	rows, err := r.db.Query(ctx, q, childID)
	if err != nil {
		return nil, fmt.Errorf("query child users: %w", err)
	}
	defer rows.Close()

	var out []*models.ChildUser
	for rows.Next() {
		var cu models.ChildUser
		if err := rows.Scan(&cu.ChildID, &cu.UserID, &cu.Role, &cu.InvitedAt, &cu.Email, &cu.Name); err != nil {
			return nil, fmt.Errorf("scan child user: %w", err)
		}
		out = append(out, &cu)
	}
	return out, rows.Err()
}
