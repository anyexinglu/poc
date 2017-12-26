<template>
  <div class="wrapper">
    <svg width="100%" height="100%"></svg>
  </div>
</template>
<script>
import * as d3 from "d3";
import {esclient} from '../helpers/esHelper';
import {walkNodeToNet} from '../helpers/dataHelper';

export default {
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App'
    }
  },
  methods: {
    fetchNodeData(query) {
      return esclient.search({
        index: 'poc-aircrafts',
        body: {query}
      }).then(response => {
        let hits = response && response.hits && response.hits.hits || []
        return hits.length ? hits[0]._source : []
      })
    },
    fetchRelationsData(query) {
      return esclient.search({
        index: 'poc-relations'
      }).then(response => {
        let hits = response && response.hits && response.hits.hits || []
        return hits || []
      })
    },
    paint() {
      let nodes = this.nodes,
          links = this.links,
          svg = d3.select(".wrapper svg"),
          W = parseInt(svg.style("width")),
          H = parseInt(svg.style("height"))
      let R = 16;

      let originX = W / 2 - 40;
      let originY = H / 2;
      // build the arrow.
      svg.append("svg:defs").selectAll("marker")
          .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
          .attr("id", String)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 10)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
        .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5");

      let g = this.gRef = svg.append("g").attr("class", "force_g")
        .attr("transform", "translate(" +  originX + "," + originY + ") scale(0.8) rotate(0)");

      function zoom() {
          let rScale = /scale\(([^\)]+)\)/;
          let transformVal = g.attr('transform');
          g.attr('transform', 'translate(' + (originX + +d3.event.transform.x) + ',' + (+d3.event.transform.y + originY) + ')' + transformVal.match(rScale)[0] + ' rotate(0)');// scale(' + d3.event.transform.k + ')');
      }

      let zoomListener = d3.zoom().scaleExtent([1, 1]).on("zoom", zoom);
      svg.call(zoomListener);

      svg.call(d3.drag()
        .container(document.querySelector("svg"))
        .subject(dragsubject)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

      let simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(160))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .on("tick", ticked)

      console.log(nodes);
      console.log(links)

      function ticked() {
        let color = d3.scaleOrdinal(d3.schemeCategory20);
        let circle = svg.select("g.force_g").selectAll("circle").data(nodes);
        circle.enter().append("circle").merge(circle);
        circle.attr("cx", d => d.x)
          .attr("cy", d => d.y)
          .attr("r", d => d.depth === 0 ? 8 : Math.max(R - d.depth * 8, 6))
          .attr("fill", d => d.depth === 0 ? '#000' : color(d.depth))
          .attr('cursor', 'pointer');

        // var center = circle.enter().filter(function (d) {
        //     return d.depth === 0;
        // });
        // console.log('center', center)
        // center.append('circle')
        // .attr('r', '10')
        // .attr('stroke', '#666')
        // .style('stroke-width', '1px')
        // .attr('fill', 'none');
        // center.append('circle')
        // .attr('r', '14')
        // .attr('stroke', '#ccc')
        // .style('stroke-width', '1px')
        // .style('stroke-dasharray', '2')
        // .attr('fill', 'none');


        let tag = svg.select("g.force_g").selectAll("text.tag").data(nodes);
        tag.exit().remove();
        tag.enter().append("text").attr("class","tag").merge(tag);
        tag.attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("text-anchor", function(d) { return d.x < Math.PI === !d.children ? "start" : "end"; })
          .attr("dy",".3em")
          .attr('font-weight', function (d) {
              if (d.depth > 0) {
                  return 400;
              } else {
                  return 600;
              }
          })
          .text(function (d) {
              let text = d.text || d.value
              // 控制label长度
              if (text.length > 8 && d.depth !== 0) {
                  return text.slice(0, 5) + '...';
              }
              return text;
          })
          .on('mouseover', function (d) {
            d3.select(this).text(d.text || d.value);
          })
          .on('mouseout', function (d) {
              let text = d.text || d.value
              // 控制label长度
              if (text.length > 8 && d.depth !== 0) {
                  d3.select(this).text(text.slice(0, 5) + '...')
              }
          });

        let edges_g = svg.select("g.force_g").selectAll("g.edges").data(links);
        let enter = edges_g.enter().append("g").attr("class", "edges")

        enter.each(function(d){
          d3.select(this).append("path").attr("class","links")
            .attr('stroke', d => d.linkType === 'entity_relation' ? '#f36d12' : 'steelblue')
            .attr("d","M"+R+","+0+" L"+getDis(d.source,d.target)+",0")
            .attr("marker-end", d => d.linkType === 'entity_relation' ? 'url(#end)' : 'url(#marker)')
          let rect_g = d3.select(this).append("g").attr("class","rect_g"),
            text_g = d3.select(this).append("g").attr("class","text_g")
          let text = text_g.append("text").attr("x",getDis(d.source,d.target)/2)
            .attr("y",0).attr("dy",".3em").attr("text-anchor","middle").text(d.tag)

          let bbox = text.node().getBBox();

          rect_g.append("rect").attr("x",bbox.x-5)
            .attr("y",bbox.y)
            .attr("width",bbox.width+10)
            .attr("height",bbox.height)
            .attr("fill","white")
          //
        })
        edges_g.merge(edges_g).each(function(d){
          d3.select(this).select("path")
            .attr("d","M"+R+","+0+" L"+(getDis(d.source,d.target)-R)+",0")
          let text = d3.select(this).select("text").attr("x",getDis(d.source,d.target)/2);
          let bbox = text.node().getBBox();

          d3.select(this).select("rect").attr("x",bbox.x-5)
        })
        edges_g.attr("transform", d => {
          return getTransform(d.source,d.target,getDis(d.source,d.target))
        })
      }

      function dragsubject() {
        return simulation.find(d3.event.x - W / 2, d3.event.y - H / 2);
      }

      function dragstarted() {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d3.event.subject.fx = d3.event.subject.x;
        d3.event.subject.fy = d3.event.subject.y;
      }

      function dragged() {
        d3.event.subject.fx = d3.event.x;
        d3.event.subject.fy = d3.event.y;
      }

      function dragended() {
        if (!d3.event.active) simulation.alphaTarget(0);
        d3.event.subject.fx = null;
        d3.event.subject.fy = null;
      }

      function getDis(s,t){
        return Math.sqrt((s.x-t.x)*(s.x-t.x)+(s.y-t.y)*(s.y-t.y));
      }
      function getTransform(source, target, _dis) {
        let r;
        if (target.x > source.x) {
          if (target.y > source.y) {
            r = Math.asin((target.y - source.y) / _dis)
          } else {
            r = Math.asin((source.y - target.y) / _dis)
            r = -r;
          }

        } else {
          if (target.y > source.y) {
            r = Math.asin((target.y - source.y) / _dis)
            r = Math.PI - r;
          } else {
            r = Math.asin((source.y - target.y) / _dis)
            r -= Math.PI;
          }
        }
        r = r * (180 / Math.PI);
        return "translate(" + source.x + "," + source.y + ")rotate(" + r + ")"
      }
    }
  },
  mounted() {
    this.loading = false;
    this.fetchNodeData({match: {aircraftNo: 'No00001'}}).then(data => {
      let {links, nodes} = walkNodeToNet(data, {
        mainKey: 'aircraftNo'
      })
      this.fetchRelationsData().then(relationsData => {
        debugger
        let relationLinks = _.map(relationsData, item => ({
          source: item._source.S_No,
          target: item._source.O_No,
          tag: item._source.P_type,
          linkType: 'entity_relation'
        }))
        console.log('relationsData', relationsData)
        this.links = [...links, ...relationLinks];
        this.nodes = nodes;
        this.paint()
      })
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
  .wrapper {
    width: 1120px;
    height: 600px;
    position: relative;
    &.full-screen {
        position: fixed;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        height: 100%;
        width: 100%;
        z-index: 9999;
        background: #fff;
    }
  }
  circle {
    /* r: 10; */
    /* fill: #f1a542; */
    /* stroke: #ccc; */
  }
  .wrapper text {
    font: 12px sans-serif;
  }
  /* .links{
    stroke:steelblue;
  } */

</style>
