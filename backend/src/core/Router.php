<?php

final class Router {
  private array $routes = [];

  public function add(string $method, string $pattern, callable $handler): void {
    $method = strtoupper($method);
    $regex = $this->compile($pattern);
    $this->routes[] = [$method, $pattern, $regex, $handler];
  }

  public function dispatch(Request $req): void {
    foreach ($this->routes as [$m, $pattern, $regex, $handler]) {
      if ($m !== $req->method) continue;

      if (preg_match($regex, $req->path, $matches)) {
        $params = [];
        foreach ($matches as $k => $v) {
          if (!is_int($k)) $params[$k] = $v;
        }
        call_user_func($handler, $req, $params);
        return;
      }
    }
    Response::error('not_found', 'Route not found', 404);
  }

  private function compile(string $pattern): string {
    // "/api/events/{id}" -> "#^/api/events/(?P<id>[^/]+)$#"
    $re = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $pattern);
    return '#^' . $re . '$#';
  }
}
