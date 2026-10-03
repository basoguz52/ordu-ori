<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RefereeProfile extends Model
{
    protected $table = 'referee_profiles';

    protected $fillable = [
        'user_id',
        'license_no',
        'registry_no',
        'photo_path',
        'default_referee_type_id',
        'bio',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function defaultRefereeType()
    {
        return $this->belongsTo(RefereeType::class, 'default_referee_type_id');
    }
}
