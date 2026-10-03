<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $table = 'events';

    protected $fillable = [
        'name',
        'slug',
        'folder_key',
        'description',
        'type',
        'start_date',
        'end_date',
        'season_start_year',
        'season_end_year',
        'location',
        'is_registration_open',
        'registration_start_at',
        'registration_end_at',
        // legacy (event_files sistemine taşınacak, sonra temizlenecek)
        'bulletin_path',
        'oncikis_path',
        'kesincikis_path',
    ];

    protected $casts = [
        'is_registration_open'  => 'boolean',
        'start_date'            => 'date',
        'end_date'              => 'date',
        'registration_start_at' => 'datetime',
        'registration_end_at'   => 'datetime',
    ];

    public function files()
    {
        return $this->hasMany(EventFile::class, 'event_id');
    }

    public function registrations()
    {
        return $this->hasMany(EventRegistration::class, 'event_id');
    }

    public function results()
    {
        return $this->hasMany(EventResult::class, 'event_id');
    }

    public function referees()
    {
        return $this->hasMany(EventReferee::class, 'event_id');
    }
}
