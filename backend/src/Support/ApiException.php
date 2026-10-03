<?php

namespace App\Support;

/**
 * İş kuralı ihlallerini taşıyan hafif exception. Servis fırlatır, controller yakalayıp
 * Response::error(code, message, status) döner.
 */
class ApiException extends \RuntimeException
{
    public string $errorCode;
    public int $status;

    public function __construct(string $errorCode, string $message, int $status)
    {
        parent::__construct($message);
        $this->errorCode = $errorCode;
        $this->status = $status;
    }
}
