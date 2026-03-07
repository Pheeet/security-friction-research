package utils

import (
	"backend-api/database"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SetSecureCookie configures SameSite and Secure flags based on the environment.
func SetSecureCookie(c *gin.Context, name, value string, maxAge int) {
	env := database.GetEnv("ENV", "development")
	frontendURL := database.GetEnv("FRONTEND_URL", "")

	// Set Secure=true and SameSite=None for production or HTTPS
	if env == "production" || strings.HasPrefix(frontendURL, "https") {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie(name, value, maxAge, "/", "", true, true)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(name, value, maxAge, "/", "", false, true)
	}
}
