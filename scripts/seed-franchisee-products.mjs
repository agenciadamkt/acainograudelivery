import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sixzfcpdjtnftacuwvph.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Uso: node scripts/seed-franchisee-products.mjs <SERVICE_ROLE_KEY>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper: convert "R$50,00" to 50.00
function parseBRL(str) {
  if (!str) return 0;
  const clean = str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

const categoryNames = [
  { name: 'Acessórios', order: 1 },
  { name: 'Brindes', order: 2 },
  { name: 'Cereais & Castanhas', order: 3 },
  { name: 'Coberturas', order: 4 },
  { name: 'Descartáveis e Limpeza', order: 5 },
  { name: 'Recheios', order: 6 },
  { name: 'Toppings', order: 7 },
  { name: 'Utensílios', order: 8 },
];

// Raw product data: [code, name, unit, stock, categoryKey, price]
// categoryKey maps to categoryNames
const rawProducts = [
  [731,'Farda Preta Basica G - Açai no Grau','UN',0,'Acessórios','R$50,00'],
  [730,'Farda Preta Basica M - Açai no Grau','UN',0,'Acessórios','R$50,00'],
  [729,'Farda Preta Basica P - Açai no Grau','UN',0,'Acessórios','R$50,00'],
  [739,'Kit Placas Acrilico no Grau','UN',0,'Acessórios','R$0,00'],
  [827,'Kit Plaquinhas Adesivas','UN',0,'Acessórios','R$500,00'],
  [734,'Tapete no Grau Personalizado','UN',0,'Acessórios','R$300,00'],
  [735,'Totem WS no Grau','UN',0,'Acessórios','R$500,00'],
  [741,'Bone Amazfrut','UN',0,'Brindes','R$25,00'],
  [740,'Bone no Grau','UN',0,'Brindes','R$25,00'],
  [39,'Castanha de Caju','UN',27,'Cereais & Castanhas','R$55,00'],
  [278,'Castanha de Caju Triturado','UN',93,'Cereais & Castanhas','R$36,00'],
  [40,'Cereal 2 Kg','UN',0,'Cereais & Castanhas','R$50,00'],
  [41,'Cereal de Milho 1 Kg','UN',156,'Cereais & Castanhas','R$24,00'],
  [629,'Cobertura Blue Ice 1,3kg','UN',18,'Coberturas','R$27,00'],
  [309,'Cobertura de Abacaxi 1,3 Kg','UN',33,'Coberturas','R$22,90'],
  [47,'Cobertura de Acai 1,3 Kg','UN',21,'Coberturas','R$23,50'],
  [630,'Cobertura de Baunilha 1,3kg','UN',20,'Coberturas','R$23,90'],
  [48,'Cobertura de Caramelo 1,3 Kg','UN',22,'Coberturas','R$21,75'],
  [49,'Cobertura de Chocolate 1,3 Kg','UN',45,'Coberturas','R$34,00'],
  [50,'Cobertura de Doce de Leite 1,3 Kg','UN',25,'Coberturas','R$22,90'],
  [51,'Cobertura de Kiwi 1,3 Kg','UN',13,'Coberturas','R$22,90'],
  [55,'Cobertura de Leite Cond 1,3 Kg','UN',33,'Coberturas','R$22,90'],
  [293,'Cobertura de Maracuja 1,3 Kg','UN',28,'Coberturas','R$32,00'],
  [632,'Cobertura de Mel 1,3 Kg','UN',20,'Coberturas','R$22,00'],
  [633,'Cobertura de Melancia 1,3 Kg','UN',0,'Coberturas','R$22,90'],
  [52,'Cobertura de Menta 1,3 Kg','UN',0,'Coberturas','R$22,90'],
  [53,'Cobertura de Morango 1,3 Kg','UN',48,'Coberturas','R$22,00'],
  [54,'Cobertura de Uva 1,3 Kg','UN',27,'Coberturas','R$22,90'],
  [663,'Cobertura Fini Banana 1kg','UN',58,'Coberturas','R$30,00'],
  [665,'Cobertura Fini Beijos 1kg','UN',0,'Coberturas','R$30,00'],
  [662,'Cobertura Fini Dentadura 1kg','UN',54,'Coberturas','R$30,00'],
  [79,'Mel de Abelha 1lt','UN',27,'Coberturas','R$40,00'],
  [667,'Base M300 c/ 50 Un','PC',274,'Descartáveis e Limpeza','R$7,90'],
  [84,'Base M500 c/ 50 Un','PC',276,'Descartáveis e Limpeza','R$14,00'],
  [85,'Base M65 c/ 100 Un','PC',52,'Descartáveis e Limpeza','R$30,25'],
  [58,'Colher Reforcada Roxa 500un','PC',98,'Descartáveis e Limpeza','R$75,00'],
  [224,'Copo Descartavel 100ml c/ 50','PC',374,'Descartáveis e Limpeza','R$4,30'],
  [159,'Copo Descartavel 150 Ml','PC',22,'Descartáveis e Limpeza','R$7,00'],
  [60,'Copo Descartavel 180 Ml','PC',291,'Descartáveis e Limpeza','R$7,99'],
  [61,'Copo Descartavel 200 Ml','PC',313,'Descartáveis e Limpeza','R$8,60'],
  [62,'Copo Descartavel 250 Ml','PC',91,'Descartáveis e Limpeza','R$8,75'],
  [63,'Copo Descartavel 300 Ml','PC',164,'Descartáveis e Limpeza','R$10,25'],
  [64,'Copo Descartavel 400 Ml','PC',67,'Descartáveis e Limpeza','R$10,35'],
  [65,'Copo Descartavel 500 Ml','PC',138,'Descartáveis e Limpeza','R$11,35'],
  [669,'Copo Descartavel 50ml c/ 100un','PC',151,'Descartáveis e Limpeza','R$4,20'],
  [403,'Copo Personalizado 500 Ml Açai c/ 25','UN',161,'Descartáveis e Limpeza','R$20,25'],
  [733,'Copo WS Personalizado','UN',118,'Descartáveis e Limpeza','R$6,00'],
  [688,'Filme PVC x 100mt 1un Ultra','PC',0,'Descartáveis e Limpeza','R$9,50'],
  [686,'Filme PVC x 15mt 1un Ultra','PC',94,'Descartáveis e Limpeza','R$2,70'],
  [689,'Filme PVC x 300mt 1un Ultra','PC',0,'Descartáveis e Limpeza','R$28,00'],
  [687,'Filme PVC x 30mt 1un Ultra','PC',97,'Descartáveis e Limpeza','R$4,00'],
  [709,'Isopor 12 Lts Isoeste Fd/06','UN',11,'Descartáveis e Limpeza','R$18,45'],
  [716,'Isopor 120 Lts Isoeste','UN',6,'Descartáveis e Limpeza','R$157,50'],
  [710,'Isopor 17 Lts Isoeste Fd/06','UN',9,'Descartáveis e Limpeza','R$27,50'],
  [714,'Isopor 170 Lts Isoeste','UN',9,'Descartáveis e Limpeza','R$202,50'],
  [713,'Isopor 200 Lts c/ Dreno','UN',6,'Descartáveis e Limpeza','R$246,50'],
  [711,'Isopor 21 Lts Isoeste Fd/04','UN',11,'Descartáveis e Limpeza','R$31,50'],
  [712,'Isopor 37 Lts Isoeste Fd/02','UN',0,'Descartáveis e Limpeza','R$39,00'],
  [715,'Isopor 50 Lts Isoeste','UN',5,'Descartáveis e Limpeza','R$71,80'],
  [708,'Isopor 7 Lts Isoeste Fd/12','UN',3,'Descartáveis e Limpeza','R$10,70'],
  [77,'Lacre Personalizado Rolo 1000 Etiq','UN',23,'Descartáveis e Limpeza','R$65,00'],
  [683,'Lenco de Papel Crep 22x20cm PA00155','PC',307,'Descartáveis e Limpeza','R$1,40'],
  [684,'Lenco de Papel Seda 14x13cm PA00062','PC',251,'Descartáveis e Limpeza','R$1,51'],
  [78,'Lencos Personalizados c/ 1000 Un','PC',12,'Descartáveis e Limpeza','R$180,00'],
  [717,'Luva Desc c/ 100un','UN',468,'Descartáveis e Limpeza','R$3,50'],
  [706,'Luva G Latex c/ Po Cx1000un','UN',46,'Descartáveis e Limpeza','R$29,00'],
  [705,'Luva P Latex c/ Po Cx1000un','UN',8,'Descartáveis e Limpeza','R$29,00'],
  [704,'Pano Microfibra Rolo 30x3 Azul','UN',47,'Descartáveis e Limpeza','R$27,00'],
  [701,'Pano Multiuso Pct 5un Azul','PC',394,'Descartáveis e Limpeza','R$2,25'],
  [703,'Pano Multiuso Rolo 25mts Azul','UN',1,'Descartáveis e Limpeza','R$17,00'],
  [685,'Papel Toalha BR 20x21cm Interfolhado','PC',118,'Descartáveis e Limpeza','R$11,50'],
  [81,'Pazinha Para Sorvete c/ 100','PC',20,'Descartáveis e Limpeza','R$2,40'],
  [467,'Pote Pers 500ml Amazfrut c/ 25 Roxo','PC',120,'Descartáveis e Limpeza','R$23,00'],
  [397,'Pote Pers 500ml no Grau c/ 25','PC',311,'Descartáveis e Limpeza','R$23,00'],
  [808,'Pote Pers 750ml c/ 40 no Grau Bypack','PC',91,'Descartáveis e Limpeza','R$52,80'],
  [513,'Pote Pers 80ml Amazfrut c/ 25','PC',80,'Descartáveis e Limpeza','R$8,00'],
  [509,'Pote Pers 80ml no Grau c/ 25','PC',59,'Descartáveis e Limpeza','R$8,00'],
  [696,'Saco Lixo 100l / 100un','PC',12,'Descartáveis e Limpeza','R$44,10'],
  [697,'Saco Lixo 200l / 100un','PC',11,'Descartáveis e Limpeza','R$130,81'],
  [693,'Saco Lixo 20l / 100un','PC',22,'Descartáveis e Limpeza','R$13,70'],
  [694,'Saco Lixo 40l / 100 Un','PC',14,'Descartáveis e Limpeza','R$15,30'],
  [695,'Saco Lixo 60l / 100 Un','PC',14,'Descartáveis e Limpeza','R$29,85'],
  [699,'Sacola BR Tam G 1kg Virgem','KG',96,'Descartáveis e Limpeza','R$25,00'],
  [698,'Sacola BR Tam P 1kg Virgem','KG',35,'Descartáveis e Limpeza','R$25,00'],
  [161,'Sacos de Papel Personalizados','UN',20,'Descartáveis e Limpeza','R$264,00'],
  [668,'Tampa M300 c/ 50','PC',319,'Descartáveis e Limpeza','R$7,35'],
  [86,'Tampa M500 c/ 50','PC',294,'Descartáveis e Limpeza','R$13,00'],
  [160,'Tampa M65 c/ 100','PC',63,'Descartáveis e Limpeza','R$27,00'],
  [225,'Tampa p/ Copo Descartavel com 100ml c/ 50','PC',365,'Descartáveis e Limpeza','R$4,20'],
  [399,'Tampa Papel 500ml Selo Personalizado Acai','PC',0,'Descartáveis e Limpeza','R$125,00'],
  [164,'Tampa Para Copos 400/500 Ml','PC',91,'Descartáveis e Limpeza','R$6,85'],
  [209,'Tampa Para Pote Personalizado 480ml','PC',0,'Descartáveis e Limpeza','R$125,00'],
  [466,'Tampa Pers 500ml no Grau c/ 50','PC',66,'Descartáveis e Limpeza','R$30,50'],
  [815,'Tampa Pers 750ml c/ 50 Cristal no Grau Bypack','PC',10,'Descartáveis e Limpeza','R$45,00'],
  [512,'Tampa Pers 750ml no Grau c/ 50','PC',66,'Descartáveis e Limpeza','R$30,50'],
  [252,'Tampa Pers no Grau 1lt c/ 50un','PC',19,'Descartáveis e Limpeza','R$41,00'],
  [417,'Tampa Plastica Pers 500ml c/ 50','PC',96,'Descartáveis e Limpeza','R$32,00'],
  [796,'Touca Preta - Açai no Grau','UN',0,'Descartáveis e Limpeza','R$20,00'],
  [291,'Cookies Branco 4 Kg Doremus','UN',93,'Recheios','R$149,00'],
  [382,'Cookies Chocolate 4 Kg','UN',29,'Recheios','R$193,00'],
  [163,'Creme de Avela 1 Kg','UN',35,'Recheios','R$42,00'],
  [385,'Creme de Bueno 4 Kg','UN',0,'Recheios','R$145,00'],
  [396,'Creme de Dorella 4 Kg','UN',36,'Recheios','R$175,00'],
  [384,'Creme de Leitinho 4 Kg','UN',0,'Recheios','R$0,00'],
  [418,'Creme de Leitinho Essencial 4 Kg','UN',38,'Recheios','R$149,00'],
  [383,'Creme de Pacoca 4 Kg','UN',54,'Recheios','R$123,00'],
  [394,'Creme de Valsa 4 Kg','UN',63,'Recheios','R$173,00'],
  [108,'Doce de Leite 1 Kg','UN',72,'Recheios','R$14,50'],
  [378,'Dorella Chocolate Com Avela 4 Kg','UN',0,'Recheios','R$165,00'],
  [643,'Pasta Recheios Chocolate BR c/ Wafer 4kg','UN',17,'Recheios','R$175,00'],
  [642,'Pasta Recheios Creme de Avela 4kg','UN',16,'Recheios','R$220,00'],
  [644,'Pasta Recheios Leitinho Intense 4kg','UN',18,'Recheios','R$222,00'],
  [645,'Pasta Recheios Leitinho Ultra Cokies 4kg','UN',0,'Recheios','R$222,00'],
  [641,'Pasta Recheios Pistache 4kg','UN',0,'Recheios','R$252,00'],
  [264,'Preparo de Abacaxi 4 Kg','UN',34,'Recheios','R$85,00'],
  [654,'Preparo de Abacaxi ao Vinho 4,3 Kg','UN',20,'Recheios','R$95,00'],
  [655,'Preparo de Ameixa 4,3 Kg','UN',14,'Recheios','R$108,00'],
  [656,'Preparo de Banana 4,3 Kg','UN',19,'Recheios','R$69,00'],
  [657,'Preparo de Goiaba 4,3 Kg','UN',20,'Recheios','R$62,00'],
  [658,'Preparo de Kiwi 4,3 Kg','UN',36,'Recheios','R$95,00'],
  [659,'Preparo de Maracuja 4,3 Kg','UN',11,'Recheios','R$99,00'],
  [124,'Preparo de Morango 4 Kg','UN',26,'Recheios','R$104,00'],
  [660,'Preparo de Passas ao Rum 4,3 Kg','UN',19,'Recheios','R$99,00'],
  [650,'Recheio 1kg Avela Manga','UN',23,'Recheios','R$36,50'],
  [649,'Recheio 1kg Leitinho Manga','UN',24,'Recheios','R$33,50'],
  [653,'Recheio D Leite 1kg T Lacteo Manga','UN',19,'Recheios','R$21,00'],
  [652,'Recheio D Leite 950g T Caramelo','UN',13,'Recheios','R$25,50'],
  [793,'Skimo Chocolate ao Leite 3,5kg','UN',6,'Recheios','R$116,90'],
  [795,'Skimo Chocolate Branco 3,5kg','UN',11,'Recheios','R$108,00'],
  [794,'Skimo Chocolate Meio Amargo 3,5kg','UN',15,'Recheios','R$131,90'],
  [68,'Skimo Leitinho Balde 3,5 Kg','UN',12,'Recheios','R$123,00'],
  [637,'Straciciatella Chocolate ao Leite 3,5kg Esquimo','UN',0,'Recheios','R$169,00'],
  [638,'Straciciatella Chocolate Meio Amargo 3,5kg Esquimo','UN',0,'Recheios','R$180,00'],
  [678,'Amendoim Chocolate 400g Kuky','UN',199,'Toppings','R$7,15'],
  [677,'Amendoim Colorido 400g Kuky','UN',134,'Toppings','R$7,15'],
  [36,'Amendoim Granulado Xerem 1 Kg','UN',66,'Toppings','R$16,00'],
  [37,'Amendoim Torrado Em Banda 1 Kg','UN',127,'Toppings','R$16,00'],
  [664,'Amoras 500g Fini','UN',0,'Toppings','R$23,00'],
  [788,'Bananas 500g Fini','UN',27,'Toppings','R$23,00'],
  [38,'Barra de Chocolate Jazan Chocomais','UN',5,'Toppings','R$31,00'],
  [647,'Beijinho Pote 900g','UN',15,'Toppings','R$23,00'],
  [490,'Biju Baunilha 1,kg','UN',37,'Toppings','R$31,75'],
  [671,'Biju Chocolate 1kg Marvi Prd000905','UN',0,'Toppings','R$43,50'],
  [672,'Biju Recheado Morango 2kg','UN',9,'Toppings','R$69,00'],
  [651,'Brigadeiro Leitinho Pote 950g','UN',42,'Toppings','R$22,00'],
  [648,'Brigadeiro Pote 950g','UN',27,'Toppings','R$22,00'],
  [484,'Cascao 1,98kg','UN',11,'Toppings','R$62,50'],
  [282,'Cerejas Gelealgas 1 Kg','UN',0,'Toppings','R$22,00'],
  [283,'Cerejas Gelealgas Balde 4,5 Kg','UN',0,'Toppings','R$80,00'],
  [42,'Cerelis 1 Kg','UN',445,'Toppings','R$31,75'],
  [43,'Cerelis Balde 4,5 Kg','UN',73,'Toppings','R$105,00'],
  [483,'Cestinha 2,04kg','UN',12,'Toppings','R$76,50'],
  [44,'Choco Ball Jazan 500g','UN',0,'Toppings','R$17,00'],
  [45,'Choco Power 500g','UN',167,'Toppings','R$22,00'],
  [46,'Choco Power Gigante','UN',160,'Toppings','R$22,00'],
  [420,'Choco Waffer Branco 4 Kg','UN',38,'Toppings','R$148,00'],
  [419,'Choco Waffer Chocolate 4 Kg','UN',0,'Toppings','R$140,00'],
  [377,'Chocolate Com Avela 3,5 Kg','UN',44,'Toppings','R$147,00'],
  [804,'Chocotine 4kg Doremus','UN',0,'Toppings','R$158,00'],
  [596,'Coloreti Gigante 500g Tradicional','UN',186,'Toppings','R$16,20'],
  [59,'Coloreti Mini 500g','UN',532,'Toppings','R$16,20'],
  [674,'Delikuky 1 Kg','UN',100,'Toppings','R$18,90'],
  [789,'Dentaduras 500g Fini','UN',27,'Toppings','R$23,00'],
  [69,'Farinha de Amendoim 1 Kg','UN',23,'Toppings','R$16,00'],
  [435,'Farofa de Amendoim 1,05 Kg','UN',0,'Toppings','R$21,00'],
  [679,'Flocos de Cereais 400g Crocante','UN',105,'Toppings','R$15,00'],
  [436,'Gotas Chips Chocomais Leite 1,01kg','UN',0,'Toppings','R$25,00'],
  [70,'Gotas Pingo de Chocolate 1kg','UN',186,'Toppings','R$34,00'],
  [71,'Granola de Banana 1 Kg','UN',103,'Toppings','R$15,00'],
  [72,'Granola Tradicional 1 Kg','UN',132,'Toppings','R$15,00'],
  [73,'Granulado Colorido 1kg','UN',64,'Toppings','R$21,00'],
  [464,'Granulado Colorido 500g','UN',0,'Toppings','R$10,00'],
  [74,'Granulado Crocante 1kg','UN',93,'Toppings','R$22,00'],
  [75,'Granulado Macio 1 Kg','UN',93,'Toppings','R$22,00'],
  [676,'Jujuba Acai 500g','UN',152,'Toppings','R$7,15'],
  [76,'Jujuba Festa 1 Kg','UN',54,'Toppings','R$13,65'],
  [675,'Jujuba Sino Frutas 500g','UN',201,'Toppings','R$7,15'],
  [810,'Marsh Coracao 250g Fini','UN',0,'Toppings','R$0,00'],
  [811,'Marsh Flor 250g Fini','UN',0,'Toppings','R$0,00'],
  [812,'Marsh Pipoca Doce 250g Fini','UN',0,'Toppings','R$0,00'],
  [798,'Marsh Rech Rosa/Branco 250g Fini','UN',0,'Toppings','R$0,00'],
  [790,'Marsh Rech Torcao 250g Fini','UN',0,'Toppings','R$11,50'],
  [792,'Marsh Torcao 250g Fini','UN',48,'Toppings','R$11,50'],
  [791,'Marsh Torcao Rosa 250g Fini','UN',68,'Toppings','R$11,50'],
  [666,'Marsh Vulcao Rosa 250g Fini','UN',29,'Toppings','R$11,50'],
  [80,'Pacoca Tubitos 750g c/ 50','UN',77,'Toppings','R$21,30'],
  [728,'Balança Toledo 3 Fit','UN',0,'Utensílios','R$799,00'],
  [736,'Batedor de Acai','UN',0,'Utensílios','R$300,00'],
  [758,'Boleador 30ml Aluminio Znx7024','UN',3,'Utensílios','R$29,90'],
  [802,'Boleador 45ml Aluminio Znx7025','UN',0,'Utensílios','R$31,00'],
  [725,'Cuba Inox 201 Gn 1/1 200mm Gastronomica Ats1025','UN',5,'Utensílios','R$199,00'],
  [722,'Cuba Inox 201 Gn 1/2 200mm Gastronomica Ats1030','UN',0,'Utensílios','R$129,00'],
  [723,'Cuba Inox 201 Gn 1/3 200mm Gastronomica Ats1137','UN',12,'Utensílios','R$125,00'],
  [724,'Cuba Inox 201 Gn 1/4 200mm Gastronomica Ats1133','UN',6,'Utensílios','R$95,00'],
  [761,'Cuba Polic 10cm/1,5lt Gn 1/6 Prof Transparente 64cw135','UN',17,'Utensílios','R$45,00'],
  [762,'Cuba Polic 15cm/2,2lt Gn 1/6 Prof Transparente 66cw135','UN',18,'Utensílios','R$54,50'],
  [764,'Jogo 6 Bicos c/ Valvula Media Nsf Substituivel p/ Bisnaga Fif5355220','UN',2,'Utensílios','R$135,90'],
  [763,'Jogo 6 Tampas Reposicao p/ Bisnaga Fifo Fif4810100','UN',2,'Utensílios','R$60,00'],
  [737,'Ponteira Batedor Inox','UN',0,'Utensílios','R$600,00'],
  [738,'Porta Colher Acrilico no Grau','UN',0,'Utensílios','R$150,00'],
  [83,'Pote Pers 1 Lt c/ 25un Acai no Grau','PC',53,'Utensílios','R$38,00'],
  [510,'Pote Pers 150ml no Grau c/ 25','PC',0,'Utensílios','R$11,00'],
  [760,'Tampa Economica Vedante Gn 1/6 Translucida 60ppcwsc190','UN',13,'Utensílios','R$22,90'],
  [721,'Tampa Flip Lid Gn1/6 c/ Ranhadura/Pegador 60cwln135','UN',49,'Utensílios','R$42,00'],
  [765,'Valvula Media Nsf Amarela p/ Porcionador e Bisnaga Fif53512206','UN',4,'Utensílios','R$92,00'],
];

async function main() {
  console.log('🚀 Iniciando seed de produtos...\n');

  // 1. Create categories
  console.log('📂 Criando categorias...');
  const categoryMap = {};
  for (const cat of categoryNames) {
    const { data, error } = await supabase
      .from('franchisee_product_categories')
      .upsert({ name: cat.name, display_order: cat.order, active: true }, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) {
      // Try selecting if upsert fails
      const { data: existing } = await supabase
        .from('franchisee_product_categories')
        .select('id, name')
        .eq('name', cat.name)
        .single();
      if (existing) {
        categoryMap[cat.name] = existing.id;
        console.log(`  ✓ ${cat.name} (existente)`);
      } else {
        console.log(`  ❌ ERRO ${cat.name}: ${error.message}`);
      }
    } else if (data) {
      categoryMap[data.name] = data.id;
      console.log(`  ✓ ${data.name}`);
    }
  }

  console.log(`\n📦 Inserindo ${rawProducts.length} produtos...\n`);

  // 2. Insert products in batches of 50
  const products = rawProducts.map(([code, name, unit, stock, catName, priceStr], i) => ({
    code: String(code),
    name,
    unit,
    current_stock: stock < 0 ? 0 : stock,
    category_id: categoryMap[catName] || null,
    price: parseBRL(priceStr),
    taxa: 0,
    has_advertising_fee: false,
    advertising_fee_percentage: 0,
    active: true,
    display_order: i + 1,
  }));

  const BATCH = 50;
  let inserted = 0, errors = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const { error } = await supabase
      .from('franchisee_products')
      .insert(batch);

    if (error) {
      console.log(`  ❌ Batch ${i}-${i + BATCH}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  ✅ Lote ${Math.floor(i/BATCH)+1}: ${batch.length} produtos inseridos`);
    }
  }

  console.log(`\n🏁 Concluído! ${inserted} inseridos, ${errors} erros.`);
}

main().catch(console.error);
