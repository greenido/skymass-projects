import { SkyMass } from "@skymass/skymass";
import { Alchemy, Network, NftFilters } from "alchemy-sdk";
import "dotenv/config";

const config = {
  apiKey: process.env["ALCHEMY_KEY"],
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const nftsArray = new Array();

//
//
//
async function getNFTs(address) {
  // Wallet address
  //const address = "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3";  //"elanhalpern.eth";
  console.log(`== Going to check address: ${address}` );

  // Get non-spam NFTs
  let nfts = await alchemy.nft.getNftsForOwner(address, { excludeFilters: [NftFilters.SPAM] });
  nfts = nfts['ownedNfts'];
  
  console.log("🎁 Non-Spam NFTs\n----------------\n\n");
  for (let i = 0; i < nfts.length; i++) {
      let cNFT = nfts[i];
      let media = "";
      if (cNFT.media && cNFT.media[0]) {
        media = cNFT.media[0].thumbnail;
      }
      if (i == 1) console.log(cNFT);
      nftsArray.push( [cNFT.title, cNFT.tokenId, cNFT.description, 
        cNFT.tokenType,
        cNFT.contract.address,
        cNFT.contract.name,
        `<img src="${media}" alt="nft media" />`
      ] ); 
  }
  return nftsArray;
};

//
const NF = new Intl.NumberFormat();
function format_number(num) {
  return NF.format(num);
}

//
// Start the skymass party 🎉
//
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

sm.page("/wallet", async (ui) => {
  ui.md`## 🧮 NFT Wallet Viewer`;
 
  const nfts_adress = ui.string("nfts_address", {
    label: "Your NFTs Addres",
    placeholder: "e.g. vitalik.eth ",
    required: true,
    defaultVal: "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3"
  });

  const goBut = ui.button("button", {
    label: "Go!",
  });
  
  if (goBut.didClick) {
    ui.toast("👋🏼 Fetching all your NFTs and filtering the spam ones!");
    let nfts = await getNFTs(nfts_adress.val);
    ui.setState({ nfts });
  }

  const { nfts } = ui.getState(() => ({ nfts: [] }));
  ui.table("nfts", nfts, { 
    label: "NFTs"
  });

  // columns: {
  //   title: { label: "Title"}, 
  //   tokenId: { label: "token Id"},
  //   description: {label: "description"},
  //   tokenType: {label: "token Type"},
  //   constractAddress: {label: "Contract Address"},
  //   constractName: {label: "Contract Name"},
  //   constractThumb: {label: "Contract Thumbnail"}
  // }
  //url: {label: "GitHub URL", format: "link_new_tab" }

});

