<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class ImportLegacyFlaskData extends Command
{
    protected $signature = 'legacy:import-flask-data
        {--source= : Path to the Flask SQLite database}
        {--apply : Import data into the Laravel database}
        {--reconcile-inventory-from-orders : Reconcile stock counters during import while preserving current on-hand stock}
        {--allow-inventory-variance : Apply despite inventory discrepancies shown in the preview}';

    protected $description = 'Preview or import Flask data into the empty Laravel database';

    private const TABLES = [
        'users',
        'farms',
        'products',
        'orders',
        'order_items',
        'conversations',
        'direct_messages',
    ];

    private const REFERENCES = [
        ['farms', 'producer_id', 'users'],
        ['products', 'farm_id', 'farms'],
        ['orders', 'customer_id', 'users'],
        ['orders', 'farm_id', 'farms'],
        ['order_items', 'order_id', 'orders'],
        ['order_items', 'product_id', 'products'],
        ['conversations', 'customer_id', 'users'],
        ['conversations', 'producer_id', 'users'],
        ['direct_messages', 'conversation_id', 'conversations'],
        ['direct_messages', 'sender_id', 'users'],
    ];

    public function handle(): int
    {
        $sourcePath = $this->option('source') ?: base_path('../database/modern_farms.db');

        if (! is_file($sourcePath)) {
            $this->components->error("Legacy database file not found: {$sourcePath}");

            return self::FAILURE;
        }

        config([
            'database.connections.flask_import' => [
                'driver' => 'sqlite',
                'database' => $sourcePath,
                'prefix' => '',
                'foreign_key_constraints' => true,
                'busy_timeout' => 5000,
            ],
        ]);
        DB::purge('flask_import');

        try {
            $source = DB::connection('flask_import');
            $source->getPdo();
            $source->beginTransaction();
            $counts = [];

            foreach (self::TABLES as $table) {
                if (! $source->getSchemaBuilder()->hasTable($table) || ! Schema::hasTable($table)) {
                    throw new RuntimeException("Required source or destination table is missing: {$table}");
                }

                $counts[$table] = [
                    'source' => $source->table($table)->count(),
                    'target' => DB::table($table)->count(),
                ];
            }

            $this->table(
                ['Table', 'Flask rows', 'Laravel rows'],
                collect($counts)->map(fn (array $count, string $table): array => [
                    $table,
                    $count['source'],
                    $count['target'],
                ])->values()->all(),
            );

            $orphanedReferences = $this->findOrphanedReferences($source);

            if ($orphanedReferences !== []) {
                $this->components->error('Found source records that reference missing parent rows.');
                $this->table(
                    ['Child table', 'Foreign key', 'Parent table', 'Orphan rows'],
                    collect($orphanedReferences)
                        ->map(fn (array $reference): array => array_values($reference))
                        ->all(),
                );
            } else {
                $this->components->info('All source records have valid parent references.');
            }

            $orderStockVariances = $this->findOrderStockVariances($source);

            if ($orderStockVariances->isNotEmpty()) {
                $this->components->warn(
                    'Found product quantities where recorded stock sold differs from non-cancelled, non-rejected order lines. Review these rows before production cutover.'
                );
                $this->table(
                    ['Product ID', 'Name', 'Posted', 'Recorded sold', 'Remaining', 'Eligible order quantity', 'Last updated'],
                    $orderStockVariances->map(fn (object $product): array => [
                        $product->id,
                        $product->name,
                        $product->quantity_posted,
                        $product->quantity_sold,
                        $product->quantity_remaining,
                        $product->ordered_quantity,
                        $product->updated_at,
                    ])->all(),
                );
            } else {
                $this->components->info('Recorded sold quantities match non-cancelled order lines.');
            }

            $inventoryReconciliation = $this->previewInventoryReconciliation($source)->keyBy('id');

            if ($inventoryReconciliation->isNotEmpty()) {
                $this->components->warn(
                    'Optional reconciliation preserves current on-hand quantities, reserves eligible order lines, and raises posted stock where current on-hand exceeds it. The Flask source is not changed.'
                );
                $this->table(
                    ['ID', 'Product', 'Source posted/sold/remaining', 'Order qty', 'Proposed posted/sold/remaining', 'Status', 'Can reconcile'],
                    $inventoryReconciliation->values()->map(fn (array $product): array => [
                        $product['id'],
                        $product['name'],
                        "{$product['source_posted']} / {$product['source_sold']} / {$product['source_remaining']}",
                        $product['order_quantity'],
                        "{$product['quantity_posted']} / {$product['quantity_sold']} / {$product['quantity_remaining']}",
                        $product['status'],
                        $product['can_reconcile'] ? 'Yes' : 'No',
                    ])->all(),
                );
            } else {
                $this->components->info('Inventory reconciliation would not change any product quantities.');
            }

            $inventoryVariances = $source->table('products')
                ->whereRaw('ROUND(quantity_posted - quantity_sold, 2) <> ROUND(quantity_remaining, 2)')
                ->count();

            if ($inventoryVariances > 0) {
                $this->components->warn(
                    "Found {$inventoryVariances} product(s) where posted stock minus sold stock differs from remaining stock. Reconcile these quantities before production cutover."
                );

                $varianceRows = $source->table('products')
                    ->whereRaw('ROUND(quantity_posted - quantity_sold, 2) <> ROUND(quantity_remaining, 2)')
                    ->orderBy('id')
                    ->limit(25)
                    ->get(['id', 'name', 'quantity_posted', 'quantity_sold', 'quantity_remaining', 'updated_at']);

                $this->table(
                    ['Product ID', 'Name', 'Posted', 'Sold', 'Remaining', 'Last updated'],
                    $varianceRows->map(fn (object $product): array => [
                        $product->id,
                        $product->name,
                        $product->quantity_posted,
                        $product->quantity_sold,
                        $product->quantity_remaining,
                        $product->updated_at,
                    ])->all(),
                );

                if ($inventoryVariances > $varianceRows->count()) {
                    $this->components->warn('Only the first 25 inventory discrepancies are shown.');
                }
            } else {
                $this->components->info('Product inventory totals are internally consistent.');
            }

            if (! $this->option('apply')) {
                $this->components->info('Preview only. Pass --apply to import into Laravel.');
                $this->components->info('To apply the proposed inventory reconciliation, also pass --reconcile-inventory-from-orders.');

                return self::SUCCESS;
            }

            if ($this->option('allow-inventory-variance') && $this->option('reconcile-inventory-from-orders')) {
                $this->components->error('Choose either --allow-inventory-variance or --reconcile-inventory-from-orders, not both.');

                return self::FAILURE;
            }

            if ($this->option('reconcile-inventory-from-orders')
                && $inventoryReconciliation->contains(fn (array $product): bool => ! $product['can_reconcile'])) {
                $this->components->error('Some product stock cannot be reconciled without exceeding posted stock. Review those products before importing.');

                return self::FAILURE;
            }

            if (($inventoryVariances > 0 || $orderStockVariances->isNotEmpty())
                && ! $this->option('allow-inventory-variance')
                && ! $this->option('reconcile-inventory-from-orders')) {
                $this->components->error(
                    'Import stopped because source inventory discrepancies need reconciliation. Correct the source data or pass --reconcile-inventory-from-orders to apply the previewed stock changes, or --allow-inventory-variance to preserve source quantities.'
                );

                return self::FAILURE;
            }

            if ($orphanedReferences !== []) {
                $this->components->error(
                    'Import stopped because source records reference missing parent rows. Repair the source data before importing.'
                );

                return self::FAILURE;
            }

            $occupiedTables = collect($counts)
                ->filter(fn (array $count): bool => $count['target'] > 0)
                ->keys()
                ->all();

            if ($occupiedTables !== []) {
                $this->components->error(
                    'Import stopped because Laravel tables already contain data: '.implode(', ', $occupiedTables)
                );

                return self::FAILURE;
            }

            DB::transaction(function () use ($source, $inventoryReconciliation): void {
                foreach (self::TABLES as $table) {
                    $targetColumns = Schema::getColumnListing($table);

                    foreach ($source->table($table)->orderBy('id')->get() as $sourceRow) {
                        $row = array_intersect_key((array) $sourceRow, array_flip($targetColumns));

                        if (! array_key_exists('id', $row)) {
                            throw new RuntimeException("The {$table} source row has no primary key.");
                        }

                        if ($table === 'products' && $this->option('reconcile-inventory-from-orders')) {
                            $reconciledProduct = $inventoryReconciliation->get((int) $row['id']);

                            if ($reconciledProduct !== null) {
                                $row = array_merge($row, [
                                    'quantity_posted' => $reconciledProduct['quantity_posted'],
                                    'quantity_sold' => $reconciledProduct['quantity_sold'],
                                    'quantity_remaining' => $reconciledProduct['quantity_remaining'],
                                    'status' => $reconciledProduct['status'],
                                ]);
                            }
                        }

                        DB::table($table)->insert($row);
                    }
                }

                $this->advancePostgresSequences();
            });

            $importMessage = $this->option('reconcile-inventory-from-orders')
                ? 'Legacy data imported with the previewed inventory reconciliation.'
                : 'Legacy data imported successfully.';

            $this->components->info("{$importMessage} Passwords using Flask hashes must be reset in Laravel.");

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->components->error('Import failed: '.$exception->getMessage());

            return self::FAILURE;
        } finally {
            if (isset($source) && $source->transactionLevel() > 0) {
                $source->rollBack();
            }

            DB::purge('flask_import');
        }
    }

    private function advancePostgresSequences(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLES as $table) {
            DB::statement(
                "SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM \"{$table}\""
            );
        }
    }

    private function findOrphanedReferences(Connection $source): array
    {
        $orphanedReferences = [];

        foreach (self::REFERENCES as [$childTable, $foreignKey, $parentTable]) {
            $orphanCount = $source->table("{$childTable} as child")
                ->leftJoin("{$parentTable} as parent", "child.{$foreignKey}", '=', 'parent.id')
                ->whereNotNull("child.{$foreignKey}")
                ->whereNull('parent.id')
                ->count();

            if ($orphanCount > 0) {
                $orphanedReferences[] = [
                    'child_table' => $childTable,
                    'foreign_key' => $foreignKey,
                    'parent_table' => $parentTable,
                    'orphan_rows' => $orphanCount,
                ];
            }
        }

        return $orphanedReferences;
    }

    private function findOrderStockVariances(Connection $source): Collection
    {
        return $source->table('products')
            ->leftJoin('order_items', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('orders', 'order_items.order_id', '=', 'orders.id')
            ->select([
                'products.id',
                'products.name',
                'products.quantity_posted',
                'products.quantity_sold',
                'products.quantity_remaining',
                'products.updated_at',
            ])
            ->selectRaw(
                "ROUND(COALESCE(SUM(CASE WHEN LOWER(orders.status) NOT IN ('cancelled', 'canceled', 'rejected') THEN order_items.quantity ELSE 0 END), 0), 2) as ordered_quantity"
            )
            ->groupBy(
                'products.id',
                'products.name',
                'products.quantity_posted',
                'products.quantity_sold',
                'products.quantity_remaining',
                'products.updated_at',
            )
            ->havingRaw(
                "ROUND(products.quantity_sold, 2) <> ROUND(COALESCE(SUM(CASE WHEN LOWER(orders.status) NOT IN ('cancelled', 'canceled', 'rejected') THEN order_items.quantity ELSE 0 END), 0), 2)"
            )
            ->orderBy('products.id')
            ->get();
    }

    private function previewInventoryReconciliation(Connection $source): Collection
    {
        return $source->table('products')
            ->leftJoin('order_items', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('orders', 'order_items.order_id', '=', 'orders.id')
            ->select([
                'products.id',
                'products.name',
                'products.status',
                'products.quantity_posted',
                'products.quantity_sold',
                'products.quantity_remaining',
            ])
            ->selectRaw(
                "ROUND(COALESCE(SUM(CASE WHEN LOWER(orders.status) NOT IN ('cancelled', 'canceled', 'rejected') THEN order_items.quantity ELSE 0 END), 0), 2) as order_quantity"
            )
            ->groupBy(
                'products.id',
                'products.name',
                'products.status',
                'products.quantity_posted',
                'products.quantity_sold',
                'products.quantity_remaining',
            )
            ->orderBy('products.id')
            ->get()
            ->map(function (object $product): array {
                $sourcePosted = (float) $product->quantity_posted;
                $sourceSold = (float) $product->quantity_sold;
                $sourceRemaining = (float) $product->quantity_remaining;
                $orderQuantity = (float) $product->order_quantity;
                $posted = max($sourcePosted, $sourceSold + $sourceRemaining);
                $sold = max($sourceSold, $orderQuantity);
                $canReconcile = $sold <= $posted && round($sold, 2) === round($orderQuantity, 2);
                $remaining = $canReconcile ? $posted - $sold : 0;
                $status = $product->status;

                if (in_array($status, ['available', 'sold_out'], true)) {
                    $status = $remaining > 0 ? 'available' : 'sold_out';
                }

                return [
                    'id' => (int) $product->id,
                    'name' => $product->name,
                    'source_posted' => $sourcePosted,
                    'source_sold' => $sourceSold,
                    'source_remaining' => $sourceRemaining,
                    'order_quantity' => $orderQuantity,
                    'quantity_posted' => $posted,
                    'quantity_sold' => $sold,
                    'quantity_remaining' => $remaining,
                    'source_status' => $product->status,
                    'status' => $status,
                    'can_reconcile' => $canReconcile,
                ];
            })
            ->filter(fn (array $product): bool => ! $product['can_reconcile']
                || round($product['source_posted'], 2) !== round($product['quantity_posted'], 2)
                || round($product['source_sold'], 2) !== round($product['quantity_sold'], 2)
                || round($product['source_remaining'], 2) !== round($product['quantity_remaining'], 2)
                || $product['status'] !== $product['source_status'])
            ->values();
    }
}
