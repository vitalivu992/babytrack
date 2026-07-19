package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// Client sends emails via the simple-email-service API (SendGrid v3-compatible).
type Client struct {
	apiURL  string
	apiKey  string
	http    *http.Client
	enabled bool
}

// New creates an email client from env vars SES_API_URL and SES_API_KEY.
// If either is empty, the client is disabled (Send becomes a no-op).
func New() *Client {
	url := os.Getenv("SES_API_URL")
	key := os.Getenv("SES_API_KEY")
	return &Client{
		apiURL:  url,
		apiKey:  key,
		http:    &http.Client{Timeout: 10 * time.Second},
		enabled: url != "" && key != "",
	}
}

// sendGridRequest is the SendGrid v3-compatible payload.
type sendGridRequest struct {
	Personalizations []personalization `json:"personalizations"`
	From             contact           `json:"from"`
	Subject          string            `json:"subject"`
	Content          []content         `json:"content"`
}

type personalization struct {
	To []contact `json:"to"`
}

type contact struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type content struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

// Send sends an email via the email service. Returns nil if disabled.
func (c *Client) Send(toEmail, toName, subject, textBody, htmlBody string) error {
	if !c.enabled {
		return nil
	}

	payload := sendGridRequest{
		Personalizations: []personalization{
			{To: []contact{{Email: toEmail, Name: toName}}},
		},
		From:    contact{Email: "no-reply@linhvu.net", Name: "BabyTrack"},
		Subject: subject,
		Content: []content{
			{Type: "text/plain", Value: textBody},
			{Type: "text/html", Value: htmlBody},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	req, err := http.NewRequest("POST", c.apiURL+"/v3/mail/send", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create email request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("send email request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("email service returned status %d", resp.StatusCode)
	}
	return nil
}

// IsEnabled returns whether the email client is configured.
func (c *Client) IsEnabled() bool { return c.enabled }
