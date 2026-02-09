package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

//ตารางเก็ฐข้อมูล

type ResearchLog struct {
	ID          uint   `gorm:"primaryKey"`
	SessionID   string `json:"session_id"` //ตรวจว่าคนเดิมทำซ้ำมั้ย
	CaptchaID   string `json:"captcha_id"`
	CaptchaType string `json:"captcha_type"`
	UserInput   string `json:"user_input"`
	IsCorrect   bool   `json:"is_correct"`
	TimeTaken   int64  `json:"time_taken"`

	CreatedAt time.Time
}

type User struct {
	gorm.Model        // เพิ่ม ID, CreatedAt, UpdatedAt, DeletedAt ให้อัตโนมัติ
	Username   string `gorm:"uniqueIndex;not null" json:"username"` // ห้ามซ้ำ และห้ามว่าง
	Password   string `json:"-"`                                    // เก็บ Hash (ใส่ - เพื่อไม่ให้ส่งกลับไปหน้าบ้าน)
	Email      string `gorm:"uniqueIndex;not null" json:"email"`    // ห้ามซ้ำ
	FullName   string `json:"fullname"`
	Role       string `gorm:"default:'user'" json:"role"` // default เป็น user (เผื่อมี admin)

	// รองรับ SSO ในอนาคต
	Provider   string `gorm:"default:'local'" json:"provider"` // local, google
	ProviderID string `json:"provider_id"`                     // Google ID
}

func ConnectDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	log.Println("Connected to Database successfully")

	// --- แก้ไขตรงนี้: ใส่ &User{} เพิ่มเข้าไป ---
	// สร้างตารางอัตโนมัติทั้ง ResearchLog และ User
	err = DB.AutoMigrate(&ResearchLog{}, &User{})
	if err != nil {
		log.Fatal("Failed to migrate database: ", err)
	}
}
