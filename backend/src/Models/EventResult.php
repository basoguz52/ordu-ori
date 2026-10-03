<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventResult extends Model
{
    protected $table = 'event_results';

    protected $fillable = [
        'event_id',
        'athlete_id',
        'category_id',
        'time_ms',
        'status',
        'splits_json',
    ];

    protected $casts = [
        'time_ms'     => 'integer',
        'splits_json' => 'array', // longtext JSON
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
