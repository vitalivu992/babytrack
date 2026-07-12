package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/vitalivu992/babytrack/internal/config"
	"github.com/vitalivu992/babytrack/internal/models"
	"github.com/vitalivu992/babytrack/internal/repository"
)

// AuthService owns authentication: registration, login, JWT issuing.
type AuthService struct {
	users *repository.UserRepo
	cost  int
}

// NewAuthService constructs an AuthService.
func NewAuthService(users *repository.UserRepo) *AuthService {
	return &AuthService{users: users, cost: config.BcryptCost}
}

// RegisterInput holds the fields needed to create an account.
type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// Register creates a new user account after validating input.
func (s *AuthService) Register(ctx Ctx, in RegisterInput) (*models.User, error) {
	in.Email = normalizeEmail(in.Email)
	in.Name = strings.TrimSpace(in.Name)
	if err := validateRegister(in); err != nil {
		return nil, err
	}

	hash, err := s.hashPassword(in.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	u := &models.User{Email: in.Email, PasswordHash: hash, Name: in.Name}
	if err := s.users.CreateUser(ctx, u); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailTaken
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

// LoginInput holds the credentials for a login attempt.
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResult is returned on successful authentication.
type LoginResult struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

// Login verifies credentials and issues a JWT.
func (s *AuthService) Login(ctx Ctx, in LoginInput) (*LoginResult, error) {
	in.Email = normalizeEmail(in.Email)
	u, err := s.users.GetUserByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !s.verifyPassword(in.Password, u.PasswordHash) {
		return nil, ErrInvalidCredentials
	}
	token, err := s.GenerateJWT(u)
	if err != nil {
		return nil, err
	}
	return &LoginResult{Token: token, User: u}, nil
}

// Claims is the JWT payload.
type Claims struct {
	UserID uuid.UUID `json:"uid"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

// GenerateJWT issues a signed token for the user.
func (s *AuthService) GenerateJWT(u *models.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: u.ID,
		Email:  u.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(config.JWTExpiryHours * time.Hour)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(jwtSecretBytes())
	if err != nil {
		return "", fmt.Errorf("sign jwt: %w", err)
	}
	return signed, nil
}

// ValidateJWT parses and validates a token string, returning its claims.
func (s *AuthService) ValidateJWT(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecretBytes(), nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// hashPassword bcrypts a plaintext password.
func (s *AuthService) hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), s.cost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// verifyPassword compares plaintext against the stored hash.
func (s *AuthService) verifyPassword(pw, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}
