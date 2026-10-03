<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostMedia extends Model
{
    protected $table = 'post_media';
    public $timestamps = false; // sadece created_at

    protected $fillable = [
        'post_id',
        'storage_key',
        'original_name',
        'mime_type',
        'size_bytes',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function post()
    {
        return $this->belongsTo(Post::class, 'post_id');
    }
}
