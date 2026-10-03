<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';

    protected $fillable = [
        'email',
        'password_hash',
        'full_name',
        'phone_number',
        'is_referee',
        'is_club_manager',
        'is_admin',
        'status',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_referee'      => 'boolean',
        'is_club_manager' => 'boolean',
        'is_admin'        => 'boolean',
    ];

    // Bir kullanıcı en fazla bir kulübün yöneticisidir (clubs.manager_user_id)
    public function managedClub()
    {
        return $this->hasOne(Club::class, 'manager_user_id');
    }

    public function athletes()
    {
        return $this->hasMany(Athlete::class, 'user_id');
    }

    public function refereeAssignments()
    {
        return $this->hasMany(EventReferee::class, 'user_id');
    }

    public function refereeProfile()
    {
        return $this->hasOne(RefereeProfile::class, 'user_id');
    }
}
