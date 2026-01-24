interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface NominatimResponse {
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
  };
  lat: string;
  lon: string;
}

/**
 * Mapeamento de nomes completos de estados para siglas
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

/**
 * Converte nome completo do estado para sigla
 */
function normalizeStateName(stateName: string): string {
  return STATE_NAME_TO_CODE[stateName] || stateName;
}

/**
 * Busca informações de endereço pelo CEP usando a API ViaCEP
 * @param cep CEP no formato 00000-000 ou 00000000
 * @returns Dados do endereço ou null se não encontrado
 */
export async function getAddressByCEP(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
} | null> {
  const cleanCEP = cep.replace(/\D/g, '');

  if (cleanCEP.length !== 8) {
    throw new Error('CEP inválido');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP');
    }

    const data: ViaCEPResponse = await response.json();

    if (data.erro) {
      return null;
    }

    return {
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      cep: data.cep,
    };
  } catch (error) {
    throw new Error('Erro ao buscar endereço pelo CEP');
  }
}

/**
 * Converte coordenadas geográficas em endereço usando Nominatim (OpenStreetMap)
 * @param lat Latitude
 * @param lon Longitude
 * @returns Dados do endereço ou null se não encontrado
 */
export async function getAddressByCoordinates(
  lat: number,
  lon: number
): Promise<{
  city: string;
  state: string;
  postcode?: string;
} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao buscar endereço');
    }

    const data: NominatimResponse = await response.json();

    const city = data.address.city || data.address.town || data.address.village || '';
    const stateName = data.address.state || '';

    if (!city || !stateName) {
      return null;
    }

    // Converter nome completo para sigla (ex: "Piauí" -> "PI")
    const stateCode = normalizeStateName(stateName);

    console.log(`[Geocoding] Nominatim retornou: ${stateName}, convertido para: ${stateCode}`);

    return {
      city,
      state: stateCode,
      postcode: data.address.postcode,
    };
  } catch (error) {
    throw new Error('Erro ao converter coordenadas em endereço');
  }
}
