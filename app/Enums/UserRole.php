<?php

namespace App\Enums;

class UserRole
{
    const SUPERADMIN = 'superadmin';
    const USER = 'user';
    
    /**
     * Get all roles
     */
    public static function all(): array
    {
        return [
            self::SUPERADMIN,
            self::USER,
        ];
    }
    
    /**
     * Get roles with management access
     */
    public static function managementRoles(): array
    {
        return [
            self::SUPERADMIN,
        ];
    }
    
    /**
     * Get roles that can edit projects
     */
    public static function projectEditRoles(): array
    {
        return [
            self::SUPERADMIN,
        ];
    }
    
    /**
     * Get role labels for UI
     */
    public static function labels(): array
    {
        return [
            self::SUPERADMIN => 'Super Administrator',
            self::USER => 'User',
        ];
    }
    
    /**
     * Get the label for a specific role
     */
    public static function label(string $role): string
    {
        return self::labels()[$role] ?? $role;
    }
    
    /**
     * Get the default role for new users
     */
    public static function default(): string
    {
        return self::USER;
    }
}