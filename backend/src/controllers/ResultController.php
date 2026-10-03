<?php

final class ResultController {
  public static function listForEvent(Request $req, array $params): void {
    $eventId = (int)$params['id'];
    $pdo = Db::pdo();

    $st = $pdo->prepare("
      SELECT
        r.id, r.event_id, r.athlete_id, r.category_id, r.time_ms, r.status,
        a.first_name, a.last_name, a.license_no, a.si_chip_no,
        c.code AS category_code, c.name AS category_name,
        cl.name AS club_name, cl.code AS club_code
      FROM event_results r
      JOIN athletes a ON a.id = r.athlete_id
      LEFT JOIN categories c ON c.id = r.category_id
      LEFT JOIN clubs cl ON cl.id = a.club_id
      WHERE r.event_id = ?
      ORDER BY
        CASE r.status
          WHEN 'OK' THEN 0
          WHEN 'DNF' THEN 1
          WHEN 'DSQ' THEN 2
          WHEN 'DNS' THEN 3
          ELSE 9
        END,
        r.time_ms ASC
    ");
    $st->execute([$eventId]);

    Response::json(['items' => $st->fetchAll()]);
  }

  // Panel/hakem: upsert
  public static function upsert(Request $req): void {
    RequireAuth::run();
    $b = $req->json ?? [];

    $eventId = (int)($b['event_id'] ?? 0);
    $athleteId = (int)($b['athlete_id'] ?? 0);
    $categoryId = isset($b['category_id']) ? (int)$b['category_id'] : null;
    $timeMs = isset($b['time_ms']) ? (int)$b['time_ms'] : null;
    $status = strtoupper(trim((string)($b['status'] ?? 'OK')));

    if ($eventId <= 0 || $athleteId <= 0) {
      Response::error('validation_error', 'event_id and athlete_id required', 422);
      return;
    }

    $allowed = ['OK','DNF','DSQ','DNS'];
    if (!in_array($status, $allowed, true)) {
      Response::error('validation_error', 'invalid status', 422);
      return;
    }

    $pdo = Db::pdo();

    // unique(event_id, athlete_id) varsayımıyla upsert
    $st = $pdo->prepare("
      INSERT INTO event_results (event_id, athlete_id, category_id, time_ms, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        category_id = VALUES(category_id),
        time_ms = VALUES(time_ms),
        status = VALUES(status),
        updated_at = NOW()
    ");
    $st->execute([$eventId, $athleteId, $categoryId, $timeMs, $status]);

    Response::noContent(204);
  }
}
