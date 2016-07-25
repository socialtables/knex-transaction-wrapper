# knex-transaction-wrapper
Wrap knex-based db accessor definitions with a helper to allow them to be used with transactions

# Usage

This is super-specific to the way our services (Account Service, Guestlist
Service, etc.) create database accessors to use in Restify applications.
