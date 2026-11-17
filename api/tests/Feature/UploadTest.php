<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadTest extends TestCase
{
    use RefreshDatabase;

    private function arquivo(string $conteudoDe, string $nome, string $mimeInformado): UploadedFile
    {
        $temp = tempnam(sys_get_temp_dir(), 'gt');
        copy($conteudoDe, $temp);

        return new UploadedFile($temp, $nome, $mimeInformado, null, true);
    }

    public function test_envia_foto_do_produto(): void
    {
        Storage::fake('public');
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Cardapio);

        $foto = $this->arquivo(base_path('database/seeders/imagens/molho-extra.jpg'), 'molho.jpg', 'image/jpeg');

        $resposta = $this->post("/api/produtos/{$produto->id}/imagem", ['imagem' => $foto], ['Accept' => 'application/json'])
            ->assertOk();

        $caminho = $produto->fresh()->imagem;
        $this->assertStringStartsWith('produtos/', $caminho);
        Storage::disk('public')->assertExists($caminho);
        $this->assertNotNull($resposta->json('data.imagem_url'));
    }

    public function test_recusa_arquivo_que_finge_ser_imagem(): void
    {
        Storage::fake('public');
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Cardapio);

        $falso = tempnam(sys_get_temp_dir(), 'gt');
        file_put_contents($falso, '<?php echo "invasao"; ?>');
        $arquivo = new UploadedFile($falso, 'foto.jpg', 'image/jpeg', null, true);

        $this->post("/api/produtos/{$produto->id}/imagem", ['imagem' => $arquivo], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('imagem');

        $this->assertNull($produto->fresh()->imagem);
    }
}
