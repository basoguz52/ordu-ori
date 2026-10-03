<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'categories';
    public $timestamps = false; // tabloda created_at/updated_at yok

    protected $fillable = [
        'code',
        'name',
        'gender',
        'min_birth_year',
        'max_birth_year',
    ];

    public function athletes()
    {
        return $this->hasMany(Athlete::class, 'category_id');
    }
}
