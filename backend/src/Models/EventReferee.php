<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventReferee extends Model
{
    protected $table = 'event_referees';
    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'user_id',
        'referee_type_id',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function refereeType()
    {
        return $this->belongsTo(RefereeType::class, 'referee_type_id');
    }
}
