package utils

import (
	"backend-api/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetSecureCookie configures SameSite and Secure flags based on the environment.
func SetSecureCookie(c *gin.Context, name, value string, maxAge int) {
	isProd := database.GetEnv("ENV", "development") == "production"
	if isProd {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie(name, value, maxAge, "/", "", true, true)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(name, value, maxAge, "/", "", false, true)
	}
}
