# 1. ใช้ Base Image ที่มีขนาดเล็ก: Alpine Go
FROM golang:alpine

# 2. ตั้งโฟลเดอร์ทำงานข้างใน Container
WORKDIR /app

# 3. Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# 4. Copy โค้ดที่เหลือทั้งหมด
COPY . .

# 5. Build ชื่อ "main"
RUN go build -o main .

# 6. สั่งรัน Compiled Binary
CMD ["./main"]
