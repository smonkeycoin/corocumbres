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
  },
  {
    id: "quiero-estar-senor-en-tu-presencia",
    title: "Quiero estar, Señor, en tu presencia",
    category: "Ofertorio",
    tags: ["transcrito"],
    liturgicalMoments: ["offertory"],
    source: "LYRICS/docs/PHOTO-2026-08-22-10-38-49.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "quiero-estar-verso-1",
        type: "verse",
        label: "Verso 1",
        lines: [
          { id: "quiero-estar-line-1", lyrics: "Quiero estar, Señor, en tu presencia,", chords: [{ symbol: "Do", position: 14 }, { symbol: "Sol", position: 32 }] },
          { id: "quiero-estar-line-2", lyrics: "quiero estar, Señor, junto a tu mesa.", chords: [{ symbol: "Fa", position: 6 }, { symbol: "Do", position: 29 }, { symbol: "Sol", position: 32 }] },
          { id: "quiero-estar-line-3", lyrics: "Y llevarte hoy mis manos llenas,", chords: [{ symbol: "Do", position: 0 }, { symbol: "Sol", position: 25 }] },
          { id: "quiero-estar-line-4", lyrics: "y entregarte hoy todo mi amor.", chords: [{ symbol: "Fa", position: 5 }, { symbol: "Do", position: 27 }] }
        ],
        slides: [
          ["Quiero estar, Señor, en tu presencia,", "quiero estar, Señor, junto a tu mesa."],
          ["Y llevarte hoy mis manos llenas,", "y entregarte hoy todo mi amor."]
        ]
      },
      {
        id: "quiero-estar-coro",
        type: "chorus",
        label: "Coro",
        lines: [
          { id: "quiero-estar-line-5", lyrics: "TÓMALO Y ACÉPTALO, SEÑOR,", chords: [{ symbol: "La-", position: 0 }, { symbol: "Sol", position: 21 }] },
          { id: "quiero-estar-line-6", lyrics: "ES MI COSECHA.", chords: [{ symbol: "Do", position: 4 }, { symbol: "Sol", position: 8 }] },
          { id: "quiero-estar-line-7", lyrics: "TÓMALO, TRANSFÓRMALO, SEÑOR,", chords: [{ symbol: "La-", position: 0 }, { symbol: "Sol", position: 23 }] },
          { id: "quiero-estar-line-8", lyrics: "EN PURA OFRENDA.", chords: [{ symbol: "Do", position: 8 }] }
        ],
        slides: [
          ["TÓMALO Y ACÉPTALO, SEÑOR,", "ES MI COSECHA."],
          ["TÓMALO, TRANSFÓRMALO, SEÑOR,", "EN PURA OFRENDA."]
        ]
      },
      {
        id: "quiero-estar-verso-2",
        type: "verse",
        label: "Verso 2",
        lines: [
          { id: "quiero-estar-line-9", lyrics: "Con el pan, Señor, llevo mi vida,", chords: [{ symbol: "Do", position: 13 }, { symbol: "Sol", position: 31 }] },
          { id: "quiero-estar-line-10", lyrics: "con el cáliz lava mis heridas.", chords: [{ symbol: "Fa", position: 7 }, { symbol: "Do", position: 24 }, { symbol: "Sol", position: 27 }] },
          { id: "quiero-estar-line-11", lyrics: "A tu altar, Señor, llevo mi espiga,", chords: [{ symbol: "Do", position: 4 }, { symbol: "Sol", position: 29 }] },
          { id: "quiero-estar-line-12", lyrics: "a tu altar de amor, mi corazón.", chords: [{ symbol: "Fa", position: 7 }, { symbol: "Do", position: 29 }] }
        ],
        slides: [
          ["Con el pan, Señor, llevo mi vida,", "con el cáliz lava mis heridas."],
          ["A tu altar, Señor, llevo mi espiga,", "a tu altar de amor, mi corazón."]
        ]
      },
      {
        id: "quiero-estar-verso-3",
        type: "verse",
        label: "Verso 3",
        lines: [
          { id: "quiero-estar-line-13", lyrics: "Quiero estar, Señor, junto a tu mesa", chords: [{ symbol: "La-", position: 0 }, { symbol: "Sol", position: 31 }] },
          { id: "quiero-estar-line-14", lyrics: "y entregar mi vida entera.", chords: [{ symbol: "Fa", position: 6 }, { symbol: "Do", position: 18 }, { symbol: "Sol", position: 21 }] },
          { id: "quiero-estar-line-15", lyrics: "Quiero estar, Señor, en tu presencia", chords: [{ symbol: "La-", position: 0 }, { symbol: "Sol", position: 31 }] },
          { id: "quiero-estar-line-16", lyrics: "y entregar mi corazón.", chords: [{ symbol: "Fa", position: 6 }, { symbol: "Sol", position: 14 }, { symbol: "Sol", position: 19 }] }
        ],
        slides: [
          ["Quiero estar, Señor, junto a tu mesa", "y entregar mi vida entera."],
          ["Quiero estar, Señor, en tu presencia", "y entregar mi corazón."]
        ]
      }
    ]
  },
  {
    id: "santo-c",
    title: "Santo (C)",
    category: "Santo",
    tags: ["transcrito"],
    liturgicalMoments: ["sanctus"],
    source: "LYRICS/docs/PHOTO-2026-08-23-12-36-03.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "santo-c-intro",
        type: "intro",
        label: "Intro",
        lines: [{ id: "santo-c-line-1", lyrics: "INTRO", chords: [{ symbol: "C", position: 6 }] }],
        slides: [["INTRO"]]
      },
      {
        id: "santo-c-verso",
        type: "verse",
        label: "Verso",
        lines: [
          { id: "santo-c-line-2", lyrics: "Santo es el Señor", chords: [{ symbol: "C", position: 0 }, { symbol: "Em", position: 12 }] },
          { id: "santo-c-line-3", lyrics: "Dios creador, del universo entero", chords: [{ symbol: "F", position: 5 }, { symbol: "G", position: 28 }] },
          { id: "santo-c-line-4", lyrics: "y llenos están de su bondad", chords: [{ symbol: "C", position: 0 }, { symbol: "Em", position: 11 }, { symbol: "F", position: 24 }] },
          { id: "santo-c-line-5", lyrics: "el mar, la tierra, el cielo", chords: [{ symbol: "G", position: 7 }, { symbol: "C", position: 21 }] }
        ],
        slides: [
          ["Santo es el Señor", "Dios creador, del universo entero"],
          ["y llenos están de su bondad", "el mar, la tierra, el cielo"]
        ]
      },
      {
        id: "santo-c-coro",
        type: "chorus",
        label: "Coro",
        lines: [
          { id: "santo-c-line-6", lyrics: "Hossana, Hossana, Hossana en el cielo", chords: [{ symbol: "Em", position: 10 }, { symbol: "F", position: 13 }, { symbol: "G", position: 31 }] },
          { id: "santo-c-line-7", lyrics: "bendito el que viene,", chords: [{ symbol: "C", position: 0 }, { symbol: "Em", position: 16 }] },
          { id: "santo-c-line-8", lyrics: "en el nombre del Señor", chords: [{ symbol: "F", position: 0 }, { symbol: "G", position: 18 }] }
        ],
        slides: [
          ["Hossana, Hossana, Hossana en el cielo"],
          ["bendito el que viene,", "en el nombre del Señor"]
        ]
      }
    ]
  },
  {
    id: "estoy-cansado-de-esta-absurda-rutina",
    title: "Estoy cansado de esta absurda rutina",
    tags: ["transcrito", "requiere-revision"],
    source: "LYRICS/docs/PHOTO-2026-08-23-20-19-26.jpg",
    notes: "Titulo inferido desde la primera linea. La captura muestra el autor como Jaire y no incluye titulo visible.",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "estoy-cansado-verso-1",
        type: "verse",
        label: "1",
        lines: [
          { id: "estoy-cansado-line-1", lyrics: "Estoy cansado de esta absurda rutina", chords: [{ symbol: "D", position: 0 }, { symbol: "A", position: 33 }] },
          { id: "estoy-cansado-line-2", lyrics: "que agobia mi tiempo", chords: [{ symbol: "D", position: 20 }, { symbol: "D7", position: 24 }] },
          { id: "estoy-cansado-line-3", lyrics: "me estoy secando como tronco sin savia", chords: [{ symbol: "G", position: 12 }, { symbol: "A", position: 35 }] },
          { id: "estoy-cansado-line-4", lyrics: "en el vacío y el tedio", chords: [{ symbol: "D", position: 21 }, { symbol: "DG", position: 25 }] },
          { id: "estoy-cansado-line-5", lyrics: "Me desmorona no alcanzar mis metas", chords: [{ symbol: "G", position: 4 }, { symbol: "A", position: 33 }] },
          { id: "estoy-cansado-line-6", lyrics: "cuando el esfuerzo ha sido duro y leal", chords: [{ symbol: "F#m", position: 14 }, { symbol: "Bm", position: 36 }] },
          { id: "estoy-cansado-line-7", lyrics: "y me pregunto si camino el camino", chords: [{ symbol: "G", position: 8 }, { symbol: "A", position: 32 }] },
          { id: "estoy-cansado-line-8", lyrics: "o camino en el mar", chords: [{ symbol: "D", position: 16 }] }
        ],
        slides: [
          ["Estoy cansado de esta absurda rutina", "que agobia mi tiempo"],
          ["me estoy secando como tronco sin savia", "en el vacío y el tedio"],
          ["Me desmorona no alcanzar mis metas", "cuando el esfuerzo ha sido duro y leal"],
          ["y me pregunto si camino el camino", "o camino en el mar"]
        ]
      },
      {
        id: "estoy-cansado-seccion-1b",
        type: "verse",
        label: "1",
        slides: [
          ["Me he preguntado donde estan tus victorias", "que antaño tenías"],
          ["y te he culpado de las burlas tenaces", "que en tu amor permitías"],
          ["Pero no me detuve a pensar", "que en el fuego me debo forjar"],
          ["pues los llamados a la lucha", "todo esto tiene que pasar"]
        ]
      },
      {
        id: "estoy-cansado-verso-2",
        type: "verse",
        label: "2",
        lines: [
          { id: "estoy-cansado-line-9", lyrics: "Yo no se caminar sin ti", chords: [{ symbol: "D7", position: 0 }, { symbol: "G", position: 5 }, { symbol: "A", position: 21 }] },
          { id: "estoy-cansado-line-10", lyrics: "yo no se que esta pasando señor", chords: [{ symbol: "F#m", position: 7 }, { symbol: "Bm", position: 28 }] },
          { id: "estoy-cansado-line-11", lyrics: "cada programa que realizo en tu nombre", chords: [{ symbol: "G", position: 9 }, { symbol: "A", position: 36 }] },
          { id: "estoy-cansado-line-12", lyrics: "es una gran bendicion", chords: [{ symbol: "D", position: 16 }] }
        ],
        slides: [
          ["Yo no se caminar sin ti", "yo no se que esta pasando señor"],
          ["cada programa que realizo en tu nombre", "es una gran bendicion"]
        ]
      },
      {
        id: "estoy-cansado-seccion-2b",
        type: "verse",
        label: "2",
        lines: [
          { id: "estoy-cansado-line-13", lyrics: "SI quiero comprenderte a ti", chords: [{ symbol: "SI", position: 0 }, { symbol: "A", position: 25 }] },
          { id: "estoy-cansado-line-14", lyrics: "me pierdo en un abismo sin razón", chords: [] },
          { id: "estoy-cansado-line-15", lyrics: "por tratar de entenderte con la cabeza", chords: [] },
          { id: "estoy-cansado-line-16", lyrics: "a un lado del corazón", chords: [] }
        ],
        slides: [
          ["SI quiero comprenderte a ti", "me pierdo en un abismo sin razón"],
          ["por tratar de entenderte con la cabeza", "a un lado del corazón"]
        ]
      },
      {
        id: "estoy-cansado-final",
        type: "outro",
        label: "Final",
        slides: [
          ["Estoy poniendo en orden todas mis cosas", "para alzar el vuelo"],
          ["me has seducido como antiguo profeta", "buscarte en lo incierto"],
          ["Cada vez que quise decirte no", "tu me hiciste declarar un si"],
          ["pues yo no se elevarme sin tus alas", "ni arriesgar sin ti."],
          ["Yo no se caminar..."]
        ]
      }
    ]
  },
  {
    id: "alabanzas-al-senor",
    title: "Alabanzas al Señor",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-alabanzas-al-senor.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "alabanzas-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Este es el día y el lugar", "Dios está aquí y te quiere hablar"],
          ["Abre las puertas y escúchalo", "y déjalo entrar"]
        ]
      },
      {
        id: "alabanzas-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Este es el día y el lugar", "Dios está aquí y te quiere amar"],
          ["dale tu vida y tu corazón", "y empieza a cantar"]
        ]
      },
      {
        id: "alabanzas-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Alabanzas al señor", "por sus obras por sus dones"],
          ["Alabanzas al señor", "por la vida y su palabra"],
          ["y da gracias al señor nuestro Dios", "por su amor"]
        ]
      }
    ]
  },
  {
    id: "dios-esta-aqui",
    title: "Dios está aquí",
    tags: ["transcrito", "manuscrito"],
    source: "LYRICS/cancionero-dios-esta-aqui.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "dios-esta-aqui-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Dios está aquí, tan cierto como el aire que respiro"],
          ["tan cierto como la mañana se levanta el sol,"],
          ["tan cierto como yo te canto y me puedes oír."]
        ]
      },
      {
        id: "dios-esta-aqui-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Jesús está aquí, tan cierto como el aire que respiro,"],
          ["tan cierto como la mañana se levanta el sol,"],
          ["tan cierto como yo te canto y me puedes oír."],
          ["tan cierto como yo te canto y me puedes oír."]
        ]
      }
    ]
  },
  {
    id: "gloria",
    title: "Gloria",
    category: "Gloria",
    tags: ["transcrito"],
    liturgicalMoments: ["gloria"],
    source: "LYRICS/cancionero-gloria.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "gloria-coro-1",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Gloria a Dios en el cielo", "y en la tierra paz a los hombres"],
          ["Gloria a Dios en el cielo", "y en la tierra paz a los hombres"]
        ]
      },
      {
        id: "gloria-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Te alabamos y te bendecimos", "te adoramos, te glorificamos"],
          ["Te damos gracias Señor", "por tu inmensa Gloria"]
        ]
      },
      {
        id: "gloria-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [["Porque solo tú eres el cordero", "el que quita el pecado del mundo"], ["Ten piedad de nosotros Señor"]]
      },
      {
        id: "gloria-final",
        type: "outro",
        label: "Final",
        slides: [["Solo tú eres Santo, solo tú Señor", "Con el Espíritu Santo"], ["en la Gloria de Dios Padre, Amén"]]
      }
    ]
  },
  {
    id: "busca-primero",
    title: "Busca Primero",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-busca-primero.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "busca-primero-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Busca primero el Reino de Dios", "y su justicia divina"],
          ["y por añadidura lo demás se te dará", "Aleluya, Aleluya"]
        ]
      }
    ]
  },
  {
    id: "esto-que-te-doy",
    title: "Esto que te doy",
    category: "Ofertorio",
    tags: ["transcrito"],
    liturgicalMoments: ["offertory"],
    source: "LYRICS/cancionero-esto-que-te-doy.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "esto-que-te-doy-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Esto que te doy es vino y pan Señor", "Esto que te doy es mi trabajo"],
          ["Es mi corazón, mi alma", "es mi cuerpo y mi razón"],
          ["el esfuerzo de mi caminar"]
        ]
      },
      {
        id: "esto-que-te-doy-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Esto que te doy mi vida es Señor", "es mi amor también es mi dolor"],
          ["es la ilusión y mis sueños,", "es mi gozo y mi llorar"],
          ["es mi canto y mi oración"]
        ]
      },
      {
        id: "esto-que-te-doy-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["toma mi vida,", "pónla en tu corazón"],
          ["dame tu mano y llévame", "cambia mi pan en tu carne"],
          ["y mi vino en tu sangre", "y a mí señor"],
          ["renuévame, límpiame", "y sálvame"]
        ]
      }
    ]
  },
  {
    id: "recibeme",
    title: "Recíbeme",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-recibeme.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "recibeme-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Recíbeme", "con toda la miseria que hay en mí"],
          ["con todo los deseos de seguir", "por tu camino."]
        ]
      },
      {
        id: "recibeme-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Iluminar", "es hoy el reto en la oscuridad"],
          ["servicio entrega en fidelidad", "hasta la muerte."]
        ]
      },
      {
        id: "recibeme-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Hoy es tiempo de dar", "a manos llenas lo que se nos dio"],
          ["brillar, hasta consumirse", "iluminar a un mundo en penumbras"],
          ["hasta que no quede yo sino tú."]
        ]
      },
      {
        id: "recibeme-verso-3",
        type: "verse",
        label: "Verso 3",
        slides: [
          ["No se enciende una lámpara", "para ponerla bajo el celemín"],
          ["la luz que encendiste en mí", "la ponga yo en lo alto"],
          ["y que María me ayude a decir sí"]
        ]
      }
    ]
  },
  {
    id: "santo-hosanna",
    title: "Santo",
    category: "Santo",
    tags: ["transcrito"],
    liturgicalMoments: ["sanctus"],
    source: "LYRICS/cancionero-santo-nuevo.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "santo-hosanna-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Santo Santo", "Santo es el Señor"],
          ["Dios del Universo", "llenos están el cielo y la tierra"],
          ["de tu gloria"]
        ]
      },
      {
        id: "santo-hosanna-coro-1",
        type: "chorus",
        label: "Coro 1",
        slides: [["Hosanna, hosanna hosanna en el cielo", "Hosanna, hosanna hosanna en el cielo"]]
      },
      {
        id: "santo-hosanna-bendito",
        type: "verse",
        label: "Bendito",
        slides: [["Bendito el que viene en nombre del Señor"]]
      },
      {
        id: "santo-hosanna-coro-2",
        type: "chorus",
        label: "Coro 2",
        slides: [["Hosanna, hosanna hosanna en el cielo", "Hosanna, hosanna hosanna en el cielo"]]
      }
    ]
  },
  {
    id: "cordero-de-dios-cancionero",
    title: "Cordero de Dios",
    category: "Cordero",
    tags: ["transcrito"],
    liturgicalMoments: ["agnus_dei"],
    source: "LYRICS/cancionero-cordero-de-dios.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "cordero-cancionero-verso",
        type: "verse",
        label: "Verso",
        slides: [
          ["Cordero de Dios que quitas", "el pecado del mundo"],
          ["Ten piedad de nosotros", "ten piedad"],
          ["Cordero de Dios que quitas", "el pecado del mundo"],
          ["ten piedad de nosotros", "ten piedad"],
          ["Cordero de Dios que quitas", "el pecado del mundo"],
          ["danos la paz", "dánosla"]
        ]
      }
    ]
  },
  {
    id: "jesus-amigo",
    title: "Jesús Amigo",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-jesus-amigo.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "jesus-amigo-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Hoy te quiero contar Jesús amigo", "que contigo estoy feliz"],
          ["si tengo tu amistad lo tengo todo", "pues estás dentro de mí"],
          ["Después de comulgar me haces como tú,", "me llenas con tu paz"],
          ["en cada pedacito estás y así te das", "Estás ahí por mí porque conoces"],
          ["que sin tí pequeño soy", "de ahora en adelante nada nos separará ya lo verás"]
        ]
      },
      {
        id: "jesus-amigo-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Te escondes en el pan", "y aunque no te puedo ver"],
          ["te puedo acompañar es mi lugar preferido", "Hoy quiero comulgar abrirte mi corazón"],
          ["Así de par en par", "eres mi mejor amigo"]
        ]
      },
      {
        id: "jesus-amigo-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Dos mil años atrás a tus amigos", "invitaste a cenar y ahí les prometiste"],
          ["que con ellos por siempre ibas a estar", "y ahora cada vez que el sacerdote"],
          ["eleva el pan en el altar", "me pongo de rodillas porque sé"],
          ["que en esa hostia tu estás"]
        ]
      },
      {
        id: "jesus-amigo-coro-final",
        type: "chorus",
        label: "Coro Final",
        slides: [
          ["Te escondes en el pan", "y aunque no te puedo ver"],
          ["te puedo acompañar es mi lugar preferido", "Hoy quiero comulgar abrirte mi corazón"],
          ["Así de par en par", "eres mi mejor amigo, Jesús"]
        ]
      }
    ]
  },
  {
    id: "nadie-te-ama-como-yo",
    title: "Nadie te ama como yo",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-nadie-te-ama-como-yo.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "nadie-te-ama-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Cuánto he esperado este momento", "Cuánto he esperado que estuvieras aquí"],
          ["Cuánto he esperado que me hablaras", "Cuánto he esperado que vinieras a mí"],
          ["Yo sé bien lo que has vivido", "Yo sé bien por qué has llorado"],
          ["Yo sé bien lo que has sufrido", "Pues de tu lado no me he ido"]
        ]
      },
      {
        id: "nadie-te-ama-coro-1",
        type: "chorus",
        label: "Coro 1",
        slides: [
          ["Pues nadie te ama como yo", "Pues nadie te ama como yo"],
          ["Mira la cruz, esa es mi más grande prueba", "Nadie te ama como yo"]
        ]
      },
      {
        id: "nadie-te-ama-coro-2",
        type: "chorus",
        label: "Coro 2",
        slides: [
          ["Pues nadie te ama como yo", "Pues nadie te ama como yo"],
          ["Mira la cruz, fue por ti, fue porque te amo", "Nadie te ama como yo"]
        ]
      },
      {
        id: "nadie-te-ama-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Yo sé bien lo que me dices", "Aunque a veces no me hablas"],
          ["Yo sé bien lo que en ti sientes", "Aunque nunca lo compartas"],
          ["Yo a tu lado he caminado", "Junto a ti yo siempre he ido"],
          ["Aún a veces te he cargado", "Yo he sido tu mejor amigo"]
        ]
      }
    ]
  },
  {
    id: "hay-angeles",
    title: "Hay ángeles",
    tags: ["transcrito"],
    source: "LYRICS/cancionero-hay-angeles.jpg",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "hay-angeles-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Si sientes un murmullo muy cerca de ti,", "es un ángel llegando para recibir"],
          ["todas tus oraciones y llevarlas al cielo"]
        ]
      },
      {
        id: "hay-angeles-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Así, abre el corazón y comienza a alabar", "el gozo de cielo todo sobre el altar hay"],
          ["un ángel llegando y bendición en sus manos"]
        ]
      },
      {
        id: "hay-angeles-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Hay ángeles volando en este lugar,", "en medio del pueblo y junto al altar,"],
          ["subiendo y bajando en todas las direcciones"],
          ["No sé si la Iglesia subió o si el Cielo bajó,", "si sé que está lleno de ángeles de Dios,"],
          ["porque el mismo Dios está aquí."]
        ]
      },
      {
        id: "hay-angeles-verso-3",
        type: "verse",
        label: "Verso 3",
        slides: [
          ["Cuando los ángeles pasan", "la iglesia se alégra, ella canta ella llora,"],
          ["ella ríe y congrega,", "enfrenta al infierno, disipa el mal."],
          ["Siente la brisa del vuelo de tu ángel ahora,", "confía hermano pues esta es tu hora,"],
          ["la bendición llegó y te la vas a llevar."]
        ]
      }
    ]
  },
  {
    id: "dejate-la-cruz",
    title: "Déjate (La cruz)",
    tags: ["transcrito"],
    source: "LYRICS/dejate-la-cruz.docx",
    createdAt,
    updatedAt: createdAt,
    sections: [
      {
        id: "dejate-verso-1",
        type: "verse",
        label: "Verso 1",
        slides: [
          ["Hace ya tiempo que comprendí", "Tú me buscaste en todas partes"],
          ["La mecha que en mi un día empezó a fallar", "Tú no dejaste se apagase"],
          ["Yo lo contemplo y digo: ¿que será?", "¿Será que estaba equivocado?"],
          ["Y he descubierto que es que el loco está", "De amor muriendo porque le ame"]
        ]
      },
      {
        id: "dejate-verso-2",
        type: "verse",
        label: "Verso 2",
        slides: [
          ["Yo no he querido saber más", "De la locura que renace"],
          ["Pero la fiebre quiere regresar", "Y Él no dejó de medicarme"],
          ["Y Tú me dices"]
        ]
      },
      {
        id: "dejate-coro",
        type: "chorus",
        label: "Coro",
        slides: [
          ["Déjate, que te consuma este fuego", "No apagues ya más esta hoguera"],
          ["Que si no hay fuego no habrá luz"],
          ["Créeme, que estoy clavado por que te amo", "No encontrarás en otro lado"],
          ["Quien quiera ya morir por ti"]
        ]
      },
      {
        id: "dejate-verso-3",
        type: "verse",
        label: "Verso 3",
        slides: [
          ["No tengas miedo no te dejaré", "Las veces que tú me reclames"],
          ["Yo gozo al ver que quieres regresar", "Déjame que yo te levante"],
          ["Señor, ¿no ves que quiero regresas?", "Pero me pesa mi pasado"],
          ["Acaso pides lo que no sé dar", "El tiempo me ha lisiado el alma"]
        ]
      },
      {
        id: "dejate-verso-4",
        type: "verse",
        label: "Verso 4",
        slides: [
          ["Tanto he besado el suelo, ¿no lo ves?", "Mis manos se han cerrado tanto"],
          ["No te preocupes, te rescataré", "Mi vida cambio por la tuya"],
          ["Y Tú me dices"]
        ]
      },
      {
        id: "dejate-coro-final",
        type: "chorus",
        label: "Coro Final",
        slides: [
          ["Déjate, que te consuma este fuego", "No apagues ya más esta hoguera"],
          ["Que si no hay fuego no habrá luz"],
          ["Créeme, que estoy clavado por que te amo", "No encontrarás en otro lado"],
          ["Quien quiera ya morir por ti"],
          ["Déjate, que te consuma este fuego", "No apagues ya más esta hoguera"],
          ["Que yo encendi en tu corazón"],
          ["Créeme, que estoy clavado por que te amo", "No encontrarás en otro lado"],
          ["Quien quiera ya morir por ti"],
          ["No tengas miedo, no te dejaré"]
        ]
      }
    ]
  }
];
