<?php

use App\Models\Category;

final class CategoryController
{
    public static function list(Request $req): void
    {
        Response::json([
            'items' => Category::orderBy('code')
                ->get(['id', 'code', 'name', 'gender', 'min_birth_year', 'max_birth_year']),
        ]);
    }
}
