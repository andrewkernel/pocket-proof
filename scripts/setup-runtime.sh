#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vendor_dir="$project_root/vendor"
runner_dir="$vendor_dir/stt-runner"
model_dir="$project_root/models"
cmake_bin="${CMAKE_BIN:-cmake}"
runner_revision="bdabdb945f373651442a3693c0cd55d9af690e32"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "Pocket Proof setup currently supports native macOS arm64 only."
  exit 1
fi

if ! command -v "$cmake_bin" >/dev/null 2>&1; then
  echo "CMake is required. Install it from cmake.org or with: brew install cmake"
  exit 1
fi

mkdir -p "$vendor_dir" "$model_dir"
if [[ ! -d "$runner_dir/.git" ]]; then
  git clone https://github.com/Arm-Examples/STT-Runner.git "$runner_dir"
fi
git -C "$runner_dir" fetch --quiet origin "$runner_revision"
git -C "$runner_dir" checkout --quiet "$runner_revision"

model_revision="5359861c739e955e79d9a303bcbc70fb988958b1"
reference_model="$model_dir/ggml-small.en.bin"
optimized_model="$model_dir/ggml-small.en-q4_0.bin"
reference_sha256="c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d"
optimized_sha256="37eb5db9875dae4fdf9b2727459ccbf2ee8ba9ef5590655bb13a7b573aae241b"

if [[ ! -f "$reference_model" ]]; then
  /usr/bin/curl --fail --location --retry 3 \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/$model_revision/ggml-small.en.bin" \
    --output "$reference_model"
fi

actual_reference_sha256="$(shasum -a 256 "$reference_model" | awk '{print $1}')"
if [[ "$actual_reference_sha256" != "$reference_sha256" ]]; then
  echo "Reference model checksum mismatch. Expected $reference_sha256, received $actual_reference_sha256"
  exit 1
fi

"$cmake_bin" -S "$runner_dir" -B "$runner_dir/build-reference" --preset=native \
  -DUSE_KLEIDIAI=OFF -DBUILD_EXECUTABLE=ON -DBUILD_BENCHMARK=ON -DBUILD_UNIT_TESTS=OFF -DBUILD_JNI_LIB=OFF \
  -DGGML_METAL=OFF -DGGML_BLAS=OFF
"$cmake_bin" --build "$runner_dir/build-reference" --target stt-bench whisper-cli whisper-quantize --config Release -j 6

"$cmake_bin" -S "$runner_dir" -B "$runner_dir/build-kleidiai" --preset=native \
  -DUSE_KLEIDIAI=ON -DBUILD_EXECUTABLE=ON -DBUILD_BENCHMARK=ON -DBUILD_UNIT_TESTS=OFF -DBUILD_JNI_LIB=OFF \
  -DGGML_METAL=OFF -DGGML_BLAS=OFF
"$cmake_bin" --build "$runner_dir/build-kleidiai" --target stt-bench whisper-cli --config Release -j 6

if [[ ! -f "$optimized_model" ]]; then
  "$runner_dir/build-reference/bin/whisper-quantize" "$reference_model" "$optimized_model" q4_0
fi
actual_optimized_sha256="$(shasum -a 256 "$optimized_model" | awk '{print $1}')"
if [[ "$actual_optimized_sha256" != "$optimized_sha256" ]]; then
  echo "Optimized model checksum mismatch. Expected $optimized_sha256, received $actual_optimized_sha256"
  exit 1
fi

echo "Pocket Proof native runtime is ready."
