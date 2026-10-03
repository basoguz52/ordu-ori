<?php

namespace App\Services;

use App\Models\Athlete;
use App\Models\Category;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Support\ApiException;

/**
 * Yarışma kaydı iş kuralları (eski RegistrationController::create/delete mantığı birebir).
 */
class RegistrationService
{
    /**
     * @throws ApiException
     */
    public static function create(int $uid, array $input): EventRegistration
    {
        $eventId    = (int)($input['event_id'] ?? 0);
        $athleteId  = (int)($input['athlete_id'] ?? 0);
        $categoryId = (int)($input['category_id'] ?? 0);

        if ($eventId <= 0 || $athleteId <= 0 || $categoryId <= 0) {
            throw new ApiException('validation_error', 'event_id, athlete_id, category_id required', 422);
        }

        $event = Event::find($eventId);
        if (!$event) {
            throw new ApiException('event_not_found', 'Event not found', 404);
        }

        // 1) Kayıt penceresi
        self::assertRegistrationWindowOpen($event);

        // 2) Sporcu sahipliği
        $athlete = Athlete::where('id', $athleteId)->where('user_id', $uid)->first();
        if (!$athlete) {
            throw new ApiException('forbidden', 'Athlete does not belong to current user', 403);
        }

        // 3) Kategori uygunluğu (cinsiyet + doğum yılı)
        $category = Category::find($categoryId);
        if (!$category) {
            throw new ApiException('category_not_found', 'Category not found', 404);
        }
        self::assertCategoryEligible($athlete, $category);

        // 4) Tekil kayıt: aynı athlete + aynı event
        $exists = EventRegistration::where('event_id', $eventId)
            ->where('athlete_id', $athleteId)
            ->exists();
        if ($exists) {
            throw new ApiException('already_registered', 'Athlete already registered for this event', 409);
        }

        // 5) Insert
        $reg = new EventRegistration();
        $reg->event_id      = $eventId;
        $reg->athlete_id    = $athleteId;
        $reg->category_id   = $categoryId;
        $reg->registered_at = date('Y-m-d H:i:s');
        $reg->status        = 'pending';
        $reg->save();

        return $reg;
    }

    /**
     * @throws ApiException
     */
    public static function delete(int $uid, int $regId): void
    {
        if ($regId <= 0) {
            throw new ApiException('validation_error', 'id required', 422);
        }

        $reg = EventRegistration::with(['event', 'athlete'])->find($regId);
        if (!$reg) {
            throw new ApiException('registration_not_found', 'Registration not found', 404);
        }

        // Yetki: sadece kendi sporcusunun kaydını silebilir
        if (!$reg->athlete || (int)$reg->athlete->user_id !== $uid) {
            throw new ApiException('forbidden', 'Registration does not belong to current user', 403);
        }

        // Kayıt penceresi (create ile aynı mantık)
        if ($reg->event) {
            self::assertRegistrationWindowOpen($reg->event);
        }

        $reg->delete();
    }

    /**
     * @throws ApiException
     */
    private static function assertRegistrationWindowOpen(Event $event): void
    {
        if (!$event->is_registration_open) {
            throw new ApiException('registration_closed', 'Registrations are closed for this event', 409);
        }

        $now = new \DateTimeImmutable('now');
        $startAt = $event->registration_start_at ? new \DateTimeImmutable((string)$event->registration_start_at) : null;
        $endAt   = $event->registration_end_at ? new \DateTimeImmutable((string)$event->registration_end_at) : null;

        if ($startAt && $now < $startAt) {
            throw new ApiException('registration_not_started', 'Registration has not started yet', 409);
        }
        if ($endAt && $now > $endAt) {
            throw new ApiException('registration_ended', 'Registration period has ended', 409);
        }
    }

    /**
     * @throws ApiException
     */
    private static function assertCategoryEligible(Athlete $athlete, Category $category): void
    {
        $aGender = strtoupper(trim((string)$athlete->gender));
        $cGender = strtoupper(trim((string)($category->gender ?? '')));

        if ($cGender !== '' && $aGender !== '' && $cGender !== $aGender) {
            throw new ApiException('category_mismatch', 'Athlete gender does not match category', 409);
        }

        $birthYear = (int)$athlete->birth_year;
        $minY = (int)$category->min_birth_year;
        $maxY = (int)$category->max_birth_year;

        if ($birthYear > 0) {
            if ($minY > 0 && $birthYear < $minY) {
                throw new ApiException('category_mismatch', 'Athlete birth year is below category range', 409);
            }
            if ($maxY > 0 && $birthYear > $maxY) {
                throw new ApiException('category_mismatch', 'Athlete birth year is above category range', 409);
            }
        }
    }
}
