<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RefereeType extends Model
{
    protected $table = 'referee_types';
    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
    ];

    public function assignments()
    {
        return $this->hasMany(EventReferee::class, 'referee_type_id');
    }
}
