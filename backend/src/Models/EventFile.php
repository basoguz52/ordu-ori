<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventFile extends Model
{
    use SoftDeletes; // deleted_at kolonu var

    protected $table = 'event_files';

    protected $fillable = [
        'event_id',
        'kind',
        'storage_key',
        'original_name',
        'mime_type',
        'size_bytes',
        'checksum_sha256',
        'version',
        'is_current',
    ];

    protected $casts = [
        'is_current'  => 'boolean',
        'size_bytes'  => 'integer',
        'version'     => 'integer',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id');
    }
}
