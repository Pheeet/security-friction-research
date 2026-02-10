# 1. เลือก Base Image: ใช้ Go ที่เสถียร บน Alpine
FROM golang:alpine

# 2. ตั้งโฟลเดอร์ทำงานข้างใน Container
WORKDIR /app

# 3. ติดตั้ง Air
RUN go install github.com/air-verse/air@latest

# 4. Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# 5. Copy โค้ดที่เหลือทั้งหมด
COPY . .

# 6. สั่ง Build ชื่อ "main"
CMD ["air", "-c", ".air.toml"]