package services

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/vitalivu992/babytrack/internal/email"
	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// ShareService manages invitations and child membership.
type ShareService struct {
	invitations *repository.InvitationRepo
	sharing     *repository.ChildUserRepo
	users       *repository.UserRepo
	email       *email.Client
}

// NewShareService constructs a ShareService.
func NewShareService(invitations *repository.InvitationRepo, sharing *repository.ChildUserRepo, users *repository.UserRepo, emailClient *email.Client) *ShareService {
	return &ShareService{invitations: invitations, sharing: sharing, users: users, email: emailClient}
}

// InviteInput holds the fields for creating an invitation.
type InviteInput struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Invite creates a share invitation for an email. The inviter must be the owner
// (caller enforces) and the role must be editor/viewer.
func (s *ShareService) Invite(ctx Ctx, childID uuid.UUID, in InviteInput) (*models.Invitation, error) {
	in.Email = normalizeEmail(in.Email)
	if !emailRE.MatchString(in.Email) {
		return nil, fmtw("%w: invalid email", ErrValidation)
	}
	if in.Role != models.RoleEditor && in.Role != models.RoleViewer {
		return nil, fmtw("%w: role must be editor or viewer", ErrValidation)
	}
	inv := &models.Invitation{
		ChildID:   childID,
		Email:     in.Email,
		Role:      in.Role,
		Token:     generateToken(),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := s.invitations.Create(ctx, inv); err != nil {
		return nil, fmt.Errorf("create invitation: %w", err)
	}

	// Send invitation email (fire-and-forget)
	if s.email != nil {
		go func() {
			textBody := fmt.Sprintf("You've been invited to share a child's activity tracker on BabyTrack.\n\nUse this link to accept the invitation:\nhttps://babytrack.linhvu.net/invite/%s\n\nThis invitation expires in 7 days.\n\nBabyTrack Team", inv.Token)
			htmlBody := fmt.Sprintf("<h2>You're Invited!</h2><p>You've been invited to share a child's activity tracker on BabyTrack.</p><p><a href=\"https://babytrack.linhvu.net/invite/%s\">Click here to accept the invitation</a></p><p>This invitation expires in 7 days.</p><p>Best regards,<br>BabyTrack Team</p>", inv.Token)
			if err := s.email.Send(in.Email, "", "You're invited to BabyTrack!", textBody, htmlBody); err != nil {
				log.Printf("failed to send invitation email to %s: %v", in.Email, err)
			}
		}()
	}

	return inv, nil
}

// Accept consumes an invitation token, granting the caller the role.
func (s *ShareService) Accept(ctx Ctx, token string, userID uuid.UUID, userEmail string) (*models.ChildUser, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmtw("%w: token is required", ErrValidation)
	}
	inv, err := s.invitations.GetByToken(ctx, token)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}
	if inv.AcceptedAt != nil {
		return nil, ErrAlreadyAccepted
	}
	if time.Now().After(inv.ExpiresAt) {
		return nil, ErrExpired
	}
	if normalizeEmail(userEmail) != normalizeEmail(inv.Email) {
		return nil, fmtw("%w: invitation is for a different email", ErrAccessDenied)
	}
	if err := s.sharing.Grant(ctx, inv.ChildID, userID, inv.Role); err != nil {
		return nil, fmt.Errorf("grant on accept: %w", err)
	}
	if err := s.invitations.MarkAccepted(ctx, inv.ID); err != nil {
		// access already granted; ignore stale-mark failure
		_ = err
	}
	return &models.ChildUser{
		ChildID:   inv.ChildID,
		UserID:    userID,
		Role:      inv.Role,
		InvitedAt: time.Now(),
		Email:     userEmail,
	}, nil
}

// Members lists everyone sharing a child.
func (s *ShareService) Members(ctx Ctx, childID uuid.UUID) ([]*models.ChildUser, error) {
	return s.sharing.GetUsersByChild(ctx, childID)
}

// Revoke removes a member from a child. The caller must ensure the current user
// is the owner (owners themselves cannot be removed).
func (s *ShareService) Revoke(ctx Ctx, childID, targetUserID uuid.UUID) error {
	role, err := s.sharing.GetRole(ctx, childID, targetUserID)
	if err != nil {
		return err
	}
	if role == models.RoleOwner {
		return fmtw("%w: cannot revoke owner", ErrValidation)
	}
	return s.sharing.Revoke(ctx, childID, targetUserID)
}

// RoleFor returns the requesting user's role on a child.
func (s *ShareService) RoleFor(ctx Ctx, childID, userID uuid.UUID) (string, error) {
	return s.sharing.GetRole(ctx, childID, userID)
}

// generateToken produces a URL-safe opaque invitation token.
func generateToken() string {
	return uuid.NewString() + uuid.NewString()
}
