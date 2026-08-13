.PHONY: setup dev build test verify benchmark demo

setup:
	npm ci
	bash scripts/setup-runtime.sh

dev:
	npm run dev

build:
	npm run build

test:
	npm test

verify:
	npm run verify

benchmark:
	npm run benchmark -- --runs 5

demo:
	npm run dev
