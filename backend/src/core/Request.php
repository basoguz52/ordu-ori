<?php

final class Request {
  public string $method;
  public string $path;
  public array $query;
  public array $headers;
  public ?array $json;

  public function __construct() {
    $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $qPos = strpos($uri, '?');
    $this->path = $qPos === false ? $uri : substr($uri, 0, $qPos);

    $this->query = $_GET ?? [];
    $this->headers = $this->readHeaders();

    $this->json = null;
    $ct = $this->headers['content-type'] ?? '';
    if (str_contains($ct, 'application/json')) {
      $raw = file_get_contents('php://input');
      if ($raw !== false && strlen(trim($raw)) > 0) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE) $this->json = $decoded;
      }
    }
  }

  private function readHeaders(): array {
    $out = [];
    foreach ($_SERVER as $k => $v) {
      if (str_starts_with($k, 'HTTP_')) {
        $name = strtolower(str_replace('_', '-', substr($k, 5)));
        $out[$name] = $v;
      }
    }
    if (isset($_SERVER['CONTENT_TYPE'])) $out['content-type'] = $_SERVER['CONTENT_TYPE'];
    return $out;
  }
}
