<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Club extends Model
{
    protected $table = 'clubs';

    protected $fillable = [
        'name',
        'code',
        'description',
        'logo_path',
        'contact_email',
        'contact_phone',
        'website',
        'manager_user_id',
    ];

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }

    public function athletes()
    {
        return $this->hasMany(Athlete::class, 'club_id');
    }
}
