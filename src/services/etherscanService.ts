
'use server';

import { ethers } from "ethers";

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const BSCSCAN_API_URL = "https://api.bscscan.com/api";

export async function getBalance(address: string): Promise<string> {
  if (!BSCSCAN_API_KEY) {
    console.error("Erreur: La clé API BscScan (BSCSCAN_API_KEY) n'est pas configurée dans les variables d'environnement.");
    throw new Error("La clé API BscScan n'est pas configurée. Veuillez l'ajouter à votre fichier .env.");
  }

  try {
    const response = await fetch(
      `${BSCSCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${BSCSCAN_API_KEY}`
    );
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Erreur de l'API BscScan (status ${response.status}): ${errorBody}`);
        throw new Error(`La requête BscScan a échoué avec le statut ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "1") {
      const balanceInWei = data.result;
      const balanceInBnb = ethers.utils.formatEther(balanceInWei);
      return balanceInBnb;
    } else {
      // Gérer les cas où l'API renvoie un message d'erreur dans le champ 'result'
      if (typeof data.result === 'string' && data.result.includes('Error')) {
          console.error(`Erreur de l'API BscScan: ${data.result}`);
          throw new Error(data.result);
      }
      console.error(`Erreur de l'API BscScan: ${data.message} (Result: ${data.result})`);
      throw new Error(`Erreur de l'API BscScan: ${data.message}`);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du solde depuis BscScan:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Impossible de récupérer le solde depuis BscScan.");
  }
}
