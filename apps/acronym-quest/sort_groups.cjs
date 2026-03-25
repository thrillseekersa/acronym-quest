const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, deleteDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyD9QLXH-jJfJvq-N9d9FfCJGRr1sVL-G3g',
  authDomain: 'studygame-e5806.firebaseapp.com',
  projectId: 'studygame-e5806',
  storageBucket: 'studygame-e5806.firebasestorage.app',
  messagingSenderId: '477636094029',
  appId: '1:477636094029:web:2f6107c15c5ab6e0a37a97'
});
const db = getFirestore(app);

// Gamified group (11 users)
const gamified = [
  'user_baby_boo_1774012132685',       // Siphokazi
  'user_bebe_tajin_1774119380496',     // Bebe tajin
  'user_hlelomag_\u2605_1774017866440', // Hlelolwenkosi (★)
  'user_jay_1774000494186',            // Jaydin Cason
  'user_luthando_jba_1774013692428',   // Luthando Skosana
  'user_mila_1774001302620',           // mila
  'user_nthanda_67_1774020650366',     // Nthanda Thela (swapped)
  'user_sim_1774079575319',            // Simrin Harilall
  'user_talishakimk01*_1774120190950', // Talisha
  'user_tea_1774022233494',            // Cebodlamini
  'user_zinzi_1774018291149',          // Zinzi Nashwa
];

// Manual/Traditional group (10 users)
const manual = [
  'user_bastian_1774006990167',        // Bastian
  'user_blaze_storm_1774005606633',    // KGAOGELO
  'user_javi_1774003512569',           // Javier
  'user_kuhle_1774013727236',          // Kuhle
  'user_machete__1774022267770',       // Tefo Machete
  'user_rosem_1409_1774014171293',     // Rotshidzwa (swapped)
  'user_sedi_1774017171013',           // Lesedi
  'user_slayyqueen89_1774121281666',   // Motheo Mogano
  'user_tanelle_1774027390849',        // Tanelle
  'user_wallies_1774005963683',        // Waldo Smith
];

(async () => {
  for (const id of gamified) {
    await updateDoc(doc(db, 'users', id), { studyGroup: 'Gamified' });
    console.log('Gamified:', id);
  }
  for (const id of manual) {
    await updateDoc(doc(db, 'users', id), { studyGroup: 'Manual' });
    console.log('Manual:', id);
  }
  // Delete duplicate Zinzi
  await deleteDoc(doc(db, 'users', 'user_zinzi_slays\uD83E\uDD0F_1774015925747'));
  console.log('Deleted duplicate Zinzi');
  console.log('\nDone! 11 Gamified, 10 Manual');
  process.exit(0);
})();
