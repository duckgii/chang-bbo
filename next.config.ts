import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Docker 실행 이미지를 작게 만들기 위함
};

export default nextConfig;
