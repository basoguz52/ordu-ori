<?php

final class RequireAuth {
  public static function run(): int {
    return Auth::requireUserId();
  }
}
