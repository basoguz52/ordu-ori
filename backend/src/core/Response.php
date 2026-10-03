<?php

final class Response {
  public static function json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  }

  public static function error(string $code, string $message, int $status): void {
    self::json(['error' => ['code' => $code, 'message' => $message]], $status);
  }

  public static function noContent(int $status = 204): void {
    http_response_code($status);
  }
}
