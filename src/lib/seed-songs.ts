import { Song } from "./types";

const createdAt = "2026-08-22T00:00:00.000Z";

export const seedSongs: Song[] = [
  {
    id: "desde-ahora-en-adelante",
    title: "Desde ahora en adelante he comprendido",
    category: "Canto",
    tags: ["transcrito"],
    source: "LYRICS/6f4fc285-60e0-4f82-a639-4dba593ac4aa.JPG",
    notes: "Titulo inferido desde la primera linea.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "desde-ahora-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Desde ahora en adelante he comprendido,", "que en las cruces que se cargan estas tú"],
          ["que moriste perdonando", "diste la vida por mí"],
          ["no te olvidaré hoy he vuelto a sonreír."]
        ]
      },
      {
        id: "desde-ahora-estribillo",
        type: "chorus",
        label: "Estribillo",
        slides: [["Yo quiero ser testigo del amor de Dios..."]]
      },
      {
        id: "desde-ahora-final",
        type: "outro",
        label: "Final",
        slides: [["...y hacia ti Señor caminar."]]
      }
    ]
  },
  {
    id: "oh-senor-vengo-a-ti",
    title: "Oh Señor vengo a ti",
    tags: ["transcrito", "manuscrito"],
    source: "LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG",
    notes: "Pagina manuscrita con varias canciones. Se omitieron acordes. Algunas lineas necesitan revision humana.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "oh-senor-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Oh Señor vengo a ti", "vengo a confesar"],
          ["A tus pies encuentro paz", "puedo descansar"],
          ["Yo sin ti Dios nada soy", "Yo sin ti vuelvo a caer"],
          ["Tú eres quien me guía", "mi corazón tú puedes ver"]
        ]
      }
    ]
  },
  {
    id: "oh-senor-te-necesito",
    title: "Oh Señor te necesito",
    tags: ["transcrito", "manuscrito"],
    source: "LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG",
    notes: "Titulo inferido. Manuscrito legible parcialmente.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "te-necesito-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Oh Señor te necesito", "siempre te anhelo"],
          ["Cada hora te necesito", "mi defensor, mi salvador"],
          ["Dios te necesito", "mi salvador, Jesús mi Dios"],
          ["yo te necesito"]
        ]
      }
    ]
  },
  {
    id: "si-abunda-el-mal",
    title: "Si abunda el mal",
    tags: ["transcrito", "manuscrito"],
    source: "LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG",
    notes: "Manuscrito con una palabra dudosa marcada.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "si-abunda-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Si abunda el mal", "tu gracia es más"],
          ["tu gracia está donde tú estás", "donde tú estás soy libre en ti"],
          ["Santidad es Cristo en mí"]
        ]
      }
    ]
  },
  {
    id: "ensename-a-confiar",
    title: "Enséñame a confiar",
    tags: ["transcrito", "manuscrito"],
    source: "LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG",
    notes: "Manuscrito en parte inferior de la pagina.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "ensename-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Enséñame a confiar en ti", "cuando venga el tentador"],
          ["cuando débil soy", "me apoyo en ti"],
          ["Jesús yo en ti confiaré"]
        ]
      }
    ]
  },
  {
    id: "dios-no-se-cansa",
    title: "Dios no se cansa",
    tags: ["transcrito"],
    source: "LYRICS/3899816e-4f3d-4b3d-8345-49b22ee850ed.JPG",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "dios-no-se-cansa-verso",
        type: "verse",
        label: "Verso",
        lines: [
          { id: "dios-no-line-1", lyrics: "Dios se encuentra en este lugar", chords: [{ symbol: "C", position: 0 }, { symbol: "G", position: 5 }, { symbol: "Am", position: 8 }] },
          { id: "dios-no-line-2", lyrics: "y te acompaña cuando te vas", chords: [{ symbol: "F", position: 0 }, { symbol: "C", position: 6 }] },
          { id: "dios-no-line-3", lyrics: "Él te busca cuando lo llamas", chords: [] },
          { id: "dios-no-line-4", lyrics: "Él te busca cuando callas", chords: [] }
        ],
        slides: [
          ["Dios se encuentra en este lugar", "y te acompaña cuando te vas"],
          ["Él te busca cuando lo llamas", "Él te busca cuando callas"]
        ]
      },
      {
        id: "dios-no-se-cansa-coro",
        type: "chorus",
        label: "Coro",
        lines: [
          { id: "dios-no-line-5", lyrics: "Jesús no se cansa de obrar milagros en tu corazón", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 26 }, { symbol: "C", position: 39 }, { symbol: "G", position: 50 }] },
          { id: "dios-no-line-6", lyrics: "Jesús no se cansa de estar contigo siempre a tu alrededor", chords: [] },
          { id: "dios-no-line-7", lyrics: "Y siempre que tú lo recibas", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 3 }, { symbol: "C", position: 6 }] },
          { id: "dios-no-line-8", lyrics: "te entrega su amor", chords: [] },
          { id: "dios-no-line-9", lyrics: "Dios no se cansa de estar contigo", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 3 }, { symbol: "C", position: 7 }, { symbol: "G", position: 10 }, { symbol: "Am", position: 12 }] },
          { id: "dios-no-line-10", lyrics: "Dios nunca se cansa de ser tu amigo.", chords: [] }
        ],
        slides: [
          ["Jesús no se cansa de obrar milagros en tu corazón"],
          ["Jesús no se cansa de estar contigo siempre a tu alrededor"],
          ["Y siempre que tú lo recibas", "te entrega su amor"],
          ["Dios no se cansa de estar contigo", "Dios nunca se cansa de ser tu amigo."]
        ]
      }
    ]
  },
  {
    id: "dejame-ayudarte",
    title: "Déjame ayudarte",
    tags: ["transcrito", "captura-cortada"],
    source: "LYRICS/a0fd7bbc-38a0-4857-8185-699154924f0a.JPG; LYRICS/a0fd7bbc-38a0-4857-8185-699154924f0a 2.JPG",
    notes: "Dos archivos duplicados visualmente. La captura termina con el coro cortado.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "dejame-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Si hay duda hacia dónde voy?", "En ti me refugio Señor"],
          ["tú qué dijiste \"Yo soy\"", "Te ruego que oigas mi clamor"],
          ["Si me abruma el dolor,", "entonces te recuerdo en la Cruz"],
          ["Adoro y espero", "tu cuerpo y tu sangre Jesús"]
        ]
      },
      {
        id: "dejame-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Hoy que mi propósito es sentirme amado", "en la brevedad yo escuché tu voz."],
          ["(Diciéndome)", "Déjame ayudarte"],
          ["Déjame ayudarte", "Déjame ayudarte a llevar tu dolor"],
          ["Déjame ayudarte", "Déjame ayudarte"],
          ["Déjame ayudarte a recordar el amor.", "Que siento por ti"]
        ]
      },
      {
        id: "dejame-pre-coro",
        type: "verse",
        label: "Pre-coro",
        slides: [
          ["El hambre de ti", "nunca se puede olvidar"],
          ["La llama que arde en mí", "ya no se debe apagar"]
        ]
      },
      {
        id: "dejame-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Déjame ayudarte a entender que significas todo para mí"],
          ["Que me importas y que todo mi amor", "[REVISAR: captura cortada despues de esta linea]"]
        ]
      }
    ]
  },
  {
    id: "hemos-entregado",
    title: "Hemos entregado",
    category: "Ofertorio",
    tags: ["transcrito"],
    liturgicalMoments: ["offertory"],
    source: "LYRICS/02e18a61-c0f5-413f-898e-356dae54c461.JPG",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "hemos-verso-1",
        type: "verse",
        label: "Verso 1",
        lines: [
          { id: "hemos-line-1", lyrics: "Hemos entregado nuestras vidas al Señor", chords: [{ symbol: "C", position: 0 }, { symbol: "G", position: 16 }, { symbol: "Am", position: 33 }] },
          { id: "hemos-line-2", lyrics: "no hay mayor bendición que ser de Él", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 20 }, { symbol: "C", position: 33 }, { symbol: "G", position: 35 }] },
          { id: "hemos-line-3", lyrics: "Hemos entregado nuestras vidas al Señor", chords: [{ symbol: "C", position: 0 }, { symbol: "G", position: 16 }, { symbol: "Am", position: 33 }] },
          { id: "hemos-line-4", lyrics: "y Él ahora nos da su vida eterna", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 15 }, { symbol: "C", position: 27 }, { symbol: "G", position: 28 }, { symbol: "F", position: 30 }] }
        ],
        slides: [
          ["Hemos entregado nuestras vidas al Señor", "no hay mayor bendición que ser de Él"],
          ["Hemos entregado nuestras vidas al Señor", "y Él ahora nos da su vida eterna"]
        ]
      },
      {
        id: "hemos-verso-2",
        type: "verse",
        label: "Verso 2",
        lines: [
          { id: "hemos-line-5", lyrics: "Bendito seas Señor por este pan", chords: [{ symbol: "Am", position: 0 }, { symbol: "F", position: 25 }] },
          { id: "hemos-line-6", lyrics: "fruto de la tierra y del trabajo del hombre", chords: [{ symbol: "G", position: 0 }, { symbol: "C", position: 25 }, { symbol: "G", position: 38 }] },
          { id: "hemos-line-7", lyrics: "Bendito seas Señor por este vino", chords: [{ symbol: "Am", position: 0 }, { symbol: "F", position: 26 }] },
          { id: "hemos-line-8", lyrics: "que hemos recibido de tu amor y bondad", chords: [{ symbol: "G", position: 0 }, { symbol: "C", position: 29 }, { symbol: "G", position: 37 }] }
        ],
        slides: [
          ["Bendito seas Señor por este pan", "fruto de la tierra y del trabajo del hombre"],
          ["Bendito seas Señor por este vino", "que hemos recibido de tu amor y bondad"]
        ]
      },
      {
        id: "hemos-verso-3",
        type: "verse",
        label: "Verso 3",
        lines: [
          { id: "hemos-line-9", lyrics: "Y ahora Señor te presentamos el pan", chords: [{ symbol: "C", position: 0 }, { symbol: "G", position: 11 }, { symbol: "Am", position: 24 }] },
          { id: "hemos-line-10", lyrics: "y el vino que tú convertirás", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 16 }, { symbol: "C", position: 27 }, { symbol: "G", position: 28 }] },
          { id: "hemos-line-11", lyrics: "en el cuerpo y sangre de tu hijo Jesús", chords: [{ symbol: "C", position: 0 }, { symbol: "G", position: 16 }, { symbol: "Am", position: 31 }] },
          { id: "hemos-line-12", lyrics: "pan de vida y bebida de salvación", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 17 }, { symbol: "C", position: 30 }, { symbol: "G", position: 31 }, { symbol: "F", position: 33 }] }
        ],
        slides: [
          ["Y ahora Señor te presentamos el pan", "y el vino que tú convertirás"],
          ["en el cuerpo y sangre de tu hijo Jesús", "pan de vida y bebida de salvación"]
        ]
      }
    ]
  },
  {
    id: "piensa-en-la-virgen-maria",
    title: "Piensa en la Virgen María",
    tags: ["transcrito", "manuscrito", "requiere-revision"],
    source: "LYRICS/428f8d1b-c3f6-4c1a-bc0d-d1ddab913a0e.JPG",
    notes: "Manuscrito con varias palabras dudosas. Revisar antes de usar en misa.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "piensa-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Cuando te sientas solo y sin amor", "cuando te sea difícil ser mejor"],
          ["cuando te sientas triste en tu interior", "y necesites más que comprensión"],
          ["no te preocupes que solo no estás", "alguien contigo y de tu mano va"],
          ["alguien que no te soltará jamás", "cierra los ojos y abre el corazón"],
          ["con una oración"]
        ]
      },
      {
        id: "piensa-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Piensa en la Virgen María", "es la madre que nos cuida"],
          ["siempre que tú se lo pidas", "a Jesús le contará de ti"],
          ["Junta tus manos y dile", "que ella es tu gran amiga"],
          ["dile con una sonrisa", "que cada día la quieres más"],
          ["Como la Virgen María", "no hay otra igual"]
        ]
      }
    ]
  },
  {
    id: "estoy-aqui",
    title: "Estoy aquí",
    tags: ["transcrito", "santo"],
    source: "LYRICS/2902c6a7-c5b7-41db-8827-a076d6169c2c.JPG",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "estoy-aqui-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Estoy aquí para que infundas mi corazón con el", "anhelo de amarte es mi deseo Señor"],
          ["Vengo a ti a que me guardes de todo mal", "a refugiarme en tus manos y así descansar"],
          ["Hoy he venido a renovar nuestra amistad", "a contemplar tu santidad que me da paz"],
          ["Los privilegios de tu amor"],
          ["Hoy he venido a buscar lo que me das", "y me apacienta tu bondad tu caridad"],
          ["Eres glorioso y humilde Señor."]
        ]
      }
    ]
  },
  {
    id: "los-dones-que-presentamos",
    title: "Los dones que presentamos",
    category: "Ofertorio",
    tags: ["transcrito", "manuscrito"],
    liturgicalMoments: ["offertory"],
    source: "LYRICS/3b5bdf8a-1f6e-4534-9370-6c0d7629dcc4.JPG",
    notes: "Manuscrito. Se corrigieron acentos y saltos obvios.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "dones-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Los dones que presentamos", "no son solo vino y pan"],
          ["es nuestro trabajo, es nuestra misión", "nuestro esfuerzo, nuestros sueños, nuestra vida"]
        ]
      },
      {
        id: "dones-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Junto al pan y al vino", "traemos ante tu altar"],
          ["nuestros corazones", "como ofrenda de amor"],
          ["que a tu trono hoy se elevan", "como incienso"]
        ]
      },
      {
        id: "dones-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Recibe hoy Señor", "los dones que te presentamos"],
          ["traemos vino y pan", "que pronto se convertirá"],
          ["en tu sangre y en tu cuerpo", "sacrificio de amor vivo y real"]
        ]
      }
    ]
  }
];
