<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RefereeEventPreference extends Model
{
    protected $table = 'referee_event_preferences';

    protected $fillable = [
        'event_id',
        'user_id',
        'wants_to_serve',
        'preferred_referee_type_id',
        'note',
    ];

    protected $casts = [
        'wants_to_serve' => 'boolean',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function preferredRefereeType()
    {
        return $this->belongsTo(RefereeType::class, 'preferred_referee_type_id');
    }
}
