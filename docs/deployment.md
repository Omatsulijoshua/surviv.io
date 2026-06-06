# Deployment Notes

## Recommended topology

- `web`: static client bundle behind CDN or Nginx
- `server`: Node.js container with horizontal autoscaling
- `postgres`: managed PostgreSQL with backups and connection pooling
- `redis`: managed Redis for queue/session cache
- `nginx` or ingress: TLS termination, websocket proxying, compression

## Render-style deployment

1. Provision PostgreSQL and Redis services.
2. Set environment variables from `.env.example`.
3. Deploy `apps/server` as a web service exposing port `4000`.
4. Deploy `apps/web` as a static site or container.
5. Point `/api` and `/socket.io` traffic to the backend service.

## AWS-style deployment

1. Build and push `apps/server/Dockerfile` and `apps/web/Dockerfile` images to ECR.
2. Run the backend on ECS/Fargate.
3. Serve the web image with ECS + ALB or ship static assets to S3 + CloudFront.
4. Use RDS PostgreSQL and ElastiCache Redis.
5. Terminate HTTPS at CloudFront or ALB with ACM certificates.

## Runtime hardening

- Rotate `JWT_SECRET`
- Restrict CORS to your production origin
- Put Cloudflare or a WAF in front of the API
- Add structured logs and metrics
- Persist replay snapshots to object storage if replay support is expanded
