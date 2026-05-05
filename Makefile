.PHONY: setup dev dev-api dev-frontend test eval lint format ingest encrypt-env decrypt-env logs down clean

setup:
	@if [ ! -f .env ]; then \
		echo "No .env found. Run 'make decrypt-env' or copy .env.example to .env and fill in values."; \
		exit 1; \
	fi
	bun install
	cd frontend && bun install

dev:
	docker compose up --build

dev-api:
	bun --watch src/api/server.ts

dev-frontend:
	cd frontend && bun run dev

test:
	bun test

eval:
	@echo "Ensure the API is running before evaluating."
	bunx promptfoo eval --config evaluation/promptfoo.yaml

lint:
	bunx eslint src/ --ext .ts && bunx tsc --noEmit
	cd frontend && bun run lint

format:
	bunx prettier --write src/ frontend/src/

ingest:
	curl -s -X POST http://localhost:3000/api/ingest | jq .

encrypt-env:
	sops --encrypt .env > .env.enc

decrypt-env:
	sops --decrypt .env.enc > .env

logs:
	docker compose logs -f

down:
	docker compose down

clean:
	docker compose down -v
	rm -rf frontend/dist/
