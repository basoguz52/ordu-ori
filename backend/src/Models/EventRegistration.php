<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventRegistration extends Model
{
    protected $table = 'event_registrations';
    public $timestamps = false; // sadece registered_at var

    protected $fillable = [
        'event_id',
        'athlete_id',
        'category_id',
        'registered_at',
        'status',
    ];

    protected $casts = [
        'registered_at' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function athlete()
    {
        return $this->belongsTo(Athlete::class, 'athlete_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}
