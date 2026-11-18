<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donation_records', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('campaign_id', 128)->index();
            $table->string('campaign_title')->nullable();
            $table->string('org_id', 128)->index();
            $table->string('org_name')->nullable();
            $table->string('volunteer_id', 128)->nullable()->index();
            $table->string('volunteer_email')->nullable();
            $table->string('volunteer_name')->nullable();
            $table->unsignedBigInteger('amount_centavos');
            $table->string('currency', 8)->default('PHP');
            $table->string('status', 32)->default('pending')->index();
            $table->string('provider', 32)->default('maya');
            $table->string('maya_checkout_id')->nullable()->index();
            $table->string('maya_payment_id')->nullable();
            $table->text('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donation_records');
    }
};
