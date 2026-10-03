<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Athlete extends Model
{
    protected $table = 'athletes';

    protected $fillable = [
        'user_id',
        'club_id',
        'category_id',
        'first_name',
        'last_name',
        'gender',
        'birth_year',
        'national_id',
        'license_no',
        'si_chip_no',
    ];

    protected $casts = [
        'birth_year' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function club()
    {
        return $this->belongsTo(Club::class, 'club_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function registrations()
    {
        return $this->hasMany(EventRegistration::class, 'athlete_id');
    }
}
