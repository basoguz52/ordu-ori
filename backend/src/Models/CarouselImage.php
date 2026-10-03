<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarouselImage extends Model
{
    protected $table = 'carousel_images';

    protected $fillable = [
        'storage_key',
        'title',
        'subtitle',
        'link_url',
        'sort_order',
        'is_active',
        'original_name',
        'mime_type',
        'size_bytes',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'size_bytes' => 'integer',
    ];
}
