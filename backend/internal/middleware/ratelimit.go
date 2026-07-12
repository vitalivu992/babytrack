package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket tracks per-IP request timestamps for the sliding window.
type bucket struct {
	mu      sync.Mutex
	times   []time.Time
}

// RateLimiter is a simple in-memory sliding-window limiter keyed by IP.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	window   time.Duration
	max      int
}

// NewRateLimiter constructs a limiter allowing `max` requests per `window`.
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{buckets: map[string]*bucket{}, window: window, max: max}
	go rl.cleanup()
	return rl
}

// Allow reports whether the key is under the limit, advancing its window.
func (r *RateLimiter) Allow(key string) bool {
	r.mu.Lock()
	b, ok := r.buckets[key]
	if !ok {
		b = &bucket{}
		r.buckets[key] = b
	}
	r.mu.Unlock()

	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-r.window)
	// drop expired entries
	i := 0
	for ; i < len(b.times); i++ {
		if b.times[i].After(cutoff) {
			break
		}
	}
	b.times = b.times[i:]
	if len(b.times) >= r.max {
		return false
	}
	b.times = append(b.times, now)
	return true
}

// cleanup periodically evicts empty buckets to bound memory.
func (r *RateLimiter) cleanup() {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for range t.C {
		r.mu.Lock()
		for k, b := range r.buckets {
			b.mu.Lock()
			if len(b.times) == 0 {
				delete(r.buckets, k)
			}
			b.mu.Unlock()
		}
		r.mu.Unlock()
	}
}

// RateLimit returns gin middleware enforcing the limiter per client IP.
func RateLimit(rl *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rl.Allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}
